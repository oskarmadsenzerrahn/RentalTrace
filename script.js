// Status for hvert advarselstegn. Tegnene lægges IKKE sammen til en score –
// hvert tegn vises for sig som til stede, ikke til stede eller ukendt.
const STATUS = {
    present: { label: "Til stede",      icon: "⚠", order: 0 },
    unknown: { label: "Ukendt",         icon: "?", order: 1 },
    absent:  { label: "Ikke til stede", icon: "✓", order: 2 }
};


function signStatus(select) {

    if (select.value === "ved-ikke") {
        return "unknown";
    }

    return select.value === select.dataset.risk ? "present" : "absent";
}


// Næste skridt: markér dem, der hænger sammen med et tegn, som er til stede eller ukendt.
// Resultatet er information + handlinger – aldrig en samlet dom over boligen.
function updateNextSteps(signs) {

    const byId = {};
    signs.forEach(s => { byId[s.id] = s; });

    document.querySelectorAll("#stepList .step").forEach(step => {

        const related = (step.dataset.related || "")
            .split(",")
            .map(id => byId[id.trim()])
            .filter(s => s && s.status !== "absent");

        step.classList.toggle("step-relevant", related.length > 0);

        const reason = step.querySelector(".step-reason");

        if (!reason) {
            return;
        }

        if (related.length === 0) {
            reason.classList.add("hidden");
            reason.innerText = "";
            return;
        }

        reason.innerText = "Relevant fordi: " + related
            .map(s => s.name + " (" + STATUS[s.status].label.toLowerCase() + ")")
            .join("; ");

        reason.classList.remove("hidden");
    });
}


// =====================================================================
// MOCK-UP-TJEK
// Automatiske tjek, der i en rigtig version ville slå op i eksterne kilder.
// Her bestemmes udfaldet i admin-panelet. Nye mock-ups tilføjes blot til
// listen – de kommer automatisk med i både admin-panelet og resultatet.
//
//   id          unikt navn (bruges til at gemme admin-valget)
//   adminLabel  tekst ved knappen i admin-panelet (tændt = advarselstegn)
//   name        advarselstegnet, som det vises i resultatet
//   run(ctx, flagged) -> { status: "present" | "absent" | "unknown", detail }
// =====================================================================

const MOCK_CHECKS = [

    {
        id: "tinglysning",
        adminLabel: "Tinglysning: ejer matcher ikke udlejer",
        name: "Udlejers navn matcher ikke ejeren i tingbogen",

        run(ctx, flagged) {

            if (!ctx.landlordName) {
                return {
                    status: "unknown",
                    detail: "Skriv udlejers navn for at sammenligne med ejeren i tingbogen."
                };
            }

            if (flagged) {

                const owner = ctx.landlordName.toLowerCase() === "anders nielsen"
                    ? "Mette Holm"
                    : "Anders Nielsen";

                return {
                    status: "present",
                    detail: "Ejer ifølge tingbogen: " + owner + ". Udlejer kalder sig: " + ctx.landlordName +
                        ". Er det fremleje, skal udlejer kunne vise ejerens skriftlige tilladelse."
                };
            }

            return {
                status: "absent",
                detail: "Ejer ifølge tingbogen: " + ctx.landlordName + " – samme navn som udlejer."
            };
        }
    },

    {
        id: "shortTermRental",
        adminLabel: "Boligen findes på Airbnb / korttidsudlejning",
        name: "Boligen er også annonceret til korttidsudlejning (fx Airbnb)",

        run(ctx, flagged) {

            if (flagged) {
                return {
                    status: "present",
                    detail: "Fundet på Airbnb: \"Lys lejlighed tæt på centrum\"" +
                        (ctx.address ? " – " + ctx.address : "") +
                        ", 1.150 kr./nat. Svindlere kopierer ofte billeder og tekst fra korttidsannoncer."
                };
            }

            return {
                status: "absent",
                detail: "Ikke fundet på Airbnb eller andre korttidsplatforme."
            };
        }
    }

];


// Admin-tilstand (gemmes i browseren, så den overlever genindlæsning)
const ADMIN_KEY = "rentaltrace-admin";

let adminState = { enabled: false, flags: {} };

try {
    adminState = Object.assign(adminState, JSON.parse(localStorage.getItem(ADMIN_KEY)) || {});
}
catch (e) { /* ignorer – standardværdier bruges */ }

function saveAdminState() {
    try { localStorage.setItem(ADMIN_KEY, JSON.stringify(adminState)); }
    catch (e) { /* ignorer */ }
}

// Tjekkenes udfald gælder kun, når admin mode er slået til
function isFlagged(id) {
    return adminState.enabled && adminState.flags[id] === true;
}


function runMockChecks() {

    const ctx = {
        address: document.getElementById("address").value.trim(),
        listing: document.getElementById("listing").value.trim(),
        landlordName: document.getElementById("landlordName").value.trim()
    };

    return MOCK_CHECKS.map(check => {

        const outcome = check.run(ctx, isFlagged(check.id));

        return {
            id: check.id,
            name: check.name,
            status: outcome.status,
            detail: outcome.detail,
            auto: true
        };
    });
}


function buildAdminPanel() {

    const container = document.getElementById("adminChecks");
    container.innerHTML = "";

    MOCK_CHECKS.forEach(check => {

        const label = document.createElement("label");
        label.className = "admin-check";

        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = adminState.flags[check.id] === true;

        box.addEventListener("change", () => {
            adminState.flags[check.id] = box.checked;
            saveAdminState();
            refreshResult();
        });

        const text = document.createElement("span");
        text.innerText = check.adminLabel;

        label.append(box, text);
        container.appendChild(label);
    });
}


function setAdminMode(enabled) {

    adminState.enabled = enabled;
    saveAdminState();

    document.getElementById("adminToggle").setAttribute("aria-checked", enabled ? "true" : "false");
    document.getElementById("adminPanel").classList.toggle("hidden", !enabled);

    refreshResult();
}


// Opdatér et allerede vist resultat (uden at rulle), fx når admin ændrer et valg
function refreshResult() {

    if (!document.getElementById("result").classList.contains("hidden")) {
        renderResult();
    }
}


function setError(select, show) {

    document
        .getElementById(select.id + "-error")
        .classList
        .toggle("hidden", !show);

    select.classList.toggle("invalid", show);
    select.setAttribute("aria-invalid", show ? "true" : "false");
}


function scrollToElement(el) {

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}


function checkRisk() {

    const questions = Array.from(
        document.querySelectorAll(".risk-question")
    );

    const formError = document.getElementById("form-error");
    const result = document.getElementById("result");


    // 1. Valider: alle spørgsmål skal have et aktivt svar ("Ved ikke" tæller som et svar)

    const unanswered = questions.filter(q => q.value === "");

    questions.forEach(q => setError(q, q.value === ""));

    if (unanswered.length > 0) {

        formError.innerText =
            unanswered.length === 1
                ? "Du mangler at besvare 1 spørgsmål."
                : "Du mangler at besvare " + unanswered.length + " spørgsmål.";

        formError.classList.remove("hidden");

        result.classList.add("hidden");

        unanswered[0].focus();

        return;
    }

    formError.classList.add("hidden");

    renderResult();


    // Vis, rul ned og flyt fokus (så skærmlæsere også læser resultatet)

    result.classList.remove("hidden");
    scrollToElement(result);
    result.focus({ preventScroll: true });
}


function renderResult() {

    const questions = Array.from(
        document.querySelectorAll(".risk-question")
    );


    // 2. Find status for hvert advarselstegn: brugerens svar + automatiske (mock-up) tjek

    const signs = questions
        .map(q => ({ id: q.id, name: q.dataset.sign, status: signStatus(q) }))
        .concat(runMockChecks())
        .sort((a, b) => STATUS[a.status].order - STATUS[b.status].order);


    // 3. Næste skridt, der hænger sammen med tegnene

    updateNextSteps(signs);


    // 4. Liste med hvert advarselstegn for sig

    const list = document.getElementById("signList");
    list.innerHTML = "";

    signs.forEach(sign => {

        const li = document.createElement("li");
        li.className = "sign sign-" + sign.status;

        const icon = document.createElement("span");
        icon.className = "sign-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.innerText = STATUS[sign.status].icon;

        const body = document.createElement("div");
        body.className = "sign-body";

        const name = document.createElement("span");
        name.className = "sign-name";
        name.innerText = sign.name;

        body.appendChild(name);

        if (sign.auto) {

            const tag = document.createElement("span");
            tag.className = "sign-tag";
            tag.innerText = "Automatisk tjek · mock-up";
            body.appendChild(tag);
        }

        if (sign.detail) {

            const detail = document.createElement("span");
            detail.className = "sign-detail";
            detail.innerText = sign.detail;
            body.appendChild(detail);
        }

        const status = document.createElement("span");
        status.className = "sign-status";
        status.innerText = STATUS[sign.status].label;

        li.append(icon, body, status);
        list.appendChild(li);
    });

}


// "Tjek en ny bolig": nulstil hele formularen og gå tilbage til toppen af den
function resetForm() {

    document.getElementById("address").value = "";
    document.getElementById("listing").value = "";
    document.getElementById("landlordName").value = "";

    document.querySelectorAll(".risk-question").forEach(q => {
        q.value = "";          // tilbage til "Vælg…"
        setError(q, false);
    });

    document.querySelectorAll(".info-btn").forEach(btn => {
        btn.setAttribute("aria-expanded", "false");
        document.getElementById(btn.getAttribute("aria-controls")).classList.add("hidden");
    });

    document.getElementById("form-error").classList.add("hidden");

    const result = document.getElementById("result");
    result.classList.add("hidden");

    document.getElementById("signList").innerHTML = "";

    scrollToElement(document.querySelector(".checker"));
    document.getElementById("address").focus({ preventScroll: true });
}



// Info-knapper (?): vis/skjul forklaringen under spørgsmålet
document.querySelectorAll(".info-btn").forEach(btn => {

    btn.addEventListener("click", () => {

        const hint = document.getElementById(btn.getAttribute("aria-controls"));
        const open = btn.getAttribute("aria-expanded") === "true";

        btn.setAttribute("aria-expanded", open ? "false" : "true");
        hint.classList.toggle("hidden", open);
    });
});


// Fjern fejlmarkering, så snart et spørgsmål bliver besvaret
document.querySelectorAll(".risk-question").forEach(q => {

    q.addEventListener("change", () => {

        setError(q, false);

        const stillMissing = Array.from(
            document.querySelectorAll(".risk-question")
        ).some(other => other.value === "");

        if (!stillMissing) {
            document.getElementById("form-error").classList.add("hidden");
        }
    });
});


// Admin mode: byg panelet og gendan sidste tilstand
buildAdminPanel();

document.getElementById("adminToggle").addEventListener("click", () => {
    setAdminMode(!adminState.enabled);
});

setAdminMode(adminState.enabled);

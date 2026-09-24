function checkRisk() {

    let score = 0;

    score += Number(
        document.getElementById("whatsapp").value
    );

    score += Number(
        document.getElementById("bankTransfer").value
    );

    score += Number(
        document.getElementById("viewing").value
    );

    score += Number(
        document.getElementById("cheap").value
    );

    score += Number(
        document.getElementById("pressure").value
    );


    if (score > 100) {
        score = 100;
    }


    document
        .getElementById("result")
        .classList
        .remove("hidden");


    document.getElementById("score").innerText = score;


    const title =
        document.getElementById("riskTitle");

    const description =
        document.getElementById("riskDescription");


    if (score < 25) {

        title.innerText =
            "Lav risiko";

        description.innerText =
            "Vi har ikke fundet mange tydelige advarselssignaler.";

    }

    else if (score < 55) {

        title.innerText =
            "Vær forsigtig";

        description.innerText =
            "Der er flere forhold, som bør verificeres før du sender penge.";

    }

    else {

        title.innerText =
            "⚠ Høj risiko for scam";

        description.innerText =
            "Flere klassiske tegn på boligsvindel er til stede. Send ikke penge før udlejer og bolig er verificeret.";

    }

}
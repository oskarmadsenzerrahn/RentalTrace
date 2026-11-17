const STATUS = {

    present: {
        label: "Present",
        icon: "⚠",
        order: 0
    },

    unknown: {
        label: "Unknown",
        icon: "?",
        order: 1
    },

    absent: {
        label: "Not present",
        icon: "✓",
        order: 2
    }

};



function signStatus(select) {

    if (
        select.value === "ved-ikke"
    ) {

        return "unknown";
    }


    return (
        select.value === select.dataset.risk
            ? "present"
            : "absent"
    );
}



// --------------------------------------------------
// NEXT STEPS
// --------------------------------------------------

function updateNextSteps(signs) {

    const byId = {};


    signs.forEach(
        sign => {

            byId[sign.id] =
                sign;
        }
    );


    document
        .querySelectorAll(
            "#stepList .step"
        )
        .forEach(
            step => {

                const related =
                    (
                        step.dataset.related
                        || ""
                    )
                    .split(",")
                    .map(
                        id =>
                            byId[
                                id.trim()
                            ]
                    )
                    .filter(
                        sign =>
                            sign
                            &&
                            sign.status
                                !== "absent"
                    );


                step.classList.toggle(
                    "step-relevant",
                    related.length > 0
                );


                const reason =
                    step.querySelector(
                        ".step-reason"
                    );


                if (!reason) {

                    return;
                }


                if (
                    related.length === 0
                ) {

                    reason.classList.add(
                        "hidden"
                    );


                    reason.innerText =
                        "";


                    return;
                }


                reason.innerText =
                    "Relevant because: "
                    + related
                        .map(
                            sign =>
                                sign.name
                                + " ("
                                + STATUS[
                                    sign.status
                                ]
                                    .label
                                    .toLowerCase()
                                + ")"
                        )
                        .join("; ");


                reason.classList.remove(
                    "hidden"
                );

            }
        );
}



// --------------------------------------------------
// MOCK-UP CHECKS
// --------------------------------------------------

const MOCK_CHECKS = [

    {

        id:
            "tinglysning",


        adminLabel:
            "Land registry: owner does not match landlord",


        name:
            "Landlord's name does not match the registered property owner",


        run(
            ctx,
            flagged
        ) {

            if (
                !ctx.landlordName
            ) {

                return {

                    status:
                        "unknown",

                    detail:
                        "Enter the landlord's name to compare it with the registered property owner."

                };
            }


            if (
                flagged
            ) {

                const owner =
                    ctx.landlordName
                        .toLowerCase()
                    === "anders nielsen"

                        ? "Mette Holm"

                        : "Anders Nielsen";


                return {

                    status:
                        "present",

                    detail:
                        "Registered property owner: "
                        + owner
                        + ". The landlord identifies themselves as: "
                        + ctx.landlordName
                        + ". If this is a sublet, the landlord should be able to provide written permission from the owner."

                };
            }


            return {

                status:
                    "absent",

                detail:
                    "Registered property owner: "
                    + ctx.landlordName
                    + " – same name as the landlord."

            };
        }
    },


    {

        id:
            "shortTermRental",


        adminLabel:
            "Property found on Airbnb / short-term rental platform",


        name:
            "Property is also advertised as a short-term rental, e.g. Airbnb",


        run(
            ctx,
            flagged
        ) {

            if (
                flagged
            ) {

                return {

                    status:
                        "present",

                    detail:
                        "Found on Airbnb: \"Bright apartment close to the city centre\""
                        + (
                            ctx.address
                                ? " – "
                                    + ctx.address
                                : ""
                        )
                        + ", DKK 1,150 per night. Scammers may reuse photos and descriptions from legitimate short-term rental listings."

                };
            }


            return {

                status:
                    "absent",

                detail:
                    "Not found on Airbnb or other short-term rental platforms."

            };
        }
    }

];



// --------------------------------------------------
// ADMIN STATE
// --------------------------------------------------

const ADMIN_KEY =
    "rentaltrace-admin";


let adminState = {

    enabled:
        false,

    flags:
        {}

};



try {

    adminState =
        Object.assign(

            adminState,

            JSON.parse(
                localStorage.getItem(
                    ADMIN_KEY
                )
            )
            || {}

        );

}

catch (error) {

    // Default values remain in use.

}



function saveAdminState() {

    try {

        localStorage.setItem(

            ADMIN_KEY,

            JSON.stringify(
                adminState
            )

        );

    }

    catch (error) {

        // Ignore storage errors.

    }
}



function isFlagged(id) {

    return (

        adminState.enabled
        &&
        adminState.flags[id]
            === true

    );
}



// --------------------------------------------------
// RUN MOCK CHECKS
// --------------------------------------------------

function runMockChecks() {

    const ctx = {

        address:
            document
                .getElementById(
                    "address"
                )
                .value
                .trim(),


        listing:
            document
                .getElementById(
                    "listing"
                )
                .value
                .trim(),


        landlordName:
            document
                .getElementById(
                    "landlordName"
                )
                .value
                .trim()

    };


    return MOCK_CHECKS.map(
        check => {

            const outcome =
                check.run(

                    ctx,

                    isFlagged(
                        check.id
                    )

                );


            return {

                id:
                    check.id,

                name:
                    check.name,

                status:
                    outcome.status,

                detail:
                    outcome.detail,

                auto:
                    true

            };
        }
    );
}



// --------------------------------------------------
// BUILD ADMIN PANEL
// --------------------------------------------------

function buildAdminPanel() {

    const container =
        document.getElementById(
            "adminChecks"
        );


    container.innerHTML =
        "";


    MOCK_CHECKS.forEach(
        check => {

            const label =
                document.createElement(
                    "label"
                );


            label.className =
                "admin-check";


            const box =
                document.createElement(
                    "input"
                );


            box.type =
                "checkbox";


            box.checked =
                adminState.flags[
                    check.id
                ] === true;


            box.addEventListener(
                "change",
                () => {

                    adminState.flags[
                        check.id
                    ] = box.checked;


                    saveAdminState();


                    refreshResult();

                }
            );


            const text =
                document.createElement(
                    "span"
                );


            text.innerText =
                check.adminLabel;


            label.append(
                box,
                text
            );


            container.appendChild(
                label
            );

        }
    );
}



// --------------------------------------------------
// ADMIN MODE
// --------------------------------------------------

function setAdminMode(
    enabled
) {

    adminState.enabled =
        enabled;


    saveAdminState();


    document
        .getElementById(
            "adminToggle"
        )
        .setAttribute(

            "aria-checked",

            enabled
                ? "true"
                : "false"

        );


    document
        .getElementById(
            "adminPanel"
        )
        .classList
        .toggle(

            "hidden",

            !enabled

        );


    refreshResult();
}



function refreshResult() {

    const result =
        document.getElementById(
            "result"
        );


    if (
        !result
            .classList
            .contains(
                "hidden"
            )
    ) {

        renderResult();

    }
}



// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

function setError(
    select,
    show
) {

    const errorElement =
        document.getElementById(
            select.id
            + "-error"
        );


    if (
        errorElement
    ) {

        errorElement
            .classList
            .toggle(
                "hidden",
                !show
            );
    }


    select
        .classList
        .toggle(
            "invalid",
            show
        );


    select.setAttribute(

        "aria-invalid",

        show
            ? "true"
            : "false"

    );
}



function scrollToElement(
    element
) {

    const reduceMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    element.scrollIntoView({

        behavior:
            reduceMotion
                ? "auto"
                : "smooth",

        block:
            "start"

    });
}



// --------------------------------------------------
// CHECK RENTAL
// --------------------------------------------------

function checkRisk() {

    const questions =
        Array.from(
            document.querySelectorAll(
                ".risk-question"
            )
        );


    const formError =
        document.getElementById(
            "form-error"
        );


    const result =
        document.getElementById(
            "result"
        );


    // A question is unanswered only if
    // the default "Choose..." option is still active.

    const unanswered =
        questions.filter(
            question => {

                return (

                    !question.value
                    ||
                    question.selectedIndex
                        === 0

                );

            }
        );


    questions.forEach(
        question => {

            const missing = (

                !question.value
                ||
                question.selectedIndex
                    === 0

            );


            setError(
                question,
                missing
            );

        }
    );


    if (
        unanswered.length > 0
    ) {

        formError.innerText =

            unanswered.length === 1

                ? "You still need to answer 1 question."

                : "You still need to answer "
                    + unanswered.length
                    + " questions.";


        formError
            .classList
            .remove(
                "hidden"
            );


        result
            .classList
            .add(
                "hidden"
            );


        unanswered[0].focus();


        return;
    }


    formError
        .classList
        .add(
            "hidden"
        );


    renderResult();


    result
        .classList
        .remove(
            "hidden"
        );


    scrollToElement(
        result
    );


    result.focus({
        preventScroll:
            true
    });
}



// --------------------------------------------------
// RENDER RESULT
// --------------------------------------------------

function renderResult() {

    const questions =
        Array.from(
            document.querySelectorAll(
                ".risk-question"
            )
        );


    const signs =
        questions
            .map(
                question => ({

                    id:
                        question.id,

                    name:
                        question.dataset.sign,

                    status:
                        signStatus(
                            question
                        )

                })
            )
            .concat(
                runMockChecks()
            )
            .sort(
                (
                    a,
                    b
                ) =>

                    STATUS[
                        a.status
                    ].order

                    -

                    STATUS[
                        b.status
                    ].order

            );


    updateNextSteps(
        signs
    );


    const list =
        document.getElementById(
            "signList"
        );


    list.innerHTML =
        "";


    signs.forEach(
        sign => {

            const li =
                document.createElement(
                    "li"
                );


            li.className =
                "sign sign-"
                + sign.status;



            const icon =
                document.createElement(
                    "span"
                );


            icon.className =
                "sign-icon";


            icon.setAttribute(
                "aria-hidden",
                "true"
            );


            icon.innerText =
                STATUS[
                    sign.status
                ].icon;



            const body =
                document.createElement(
                    "div"
                );


            body.className =
                "sign-body";



            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "sign-name";


            name.innerText =
                sign.name;


            body.appendChild(
                name
            );



            if (
                sign.auto
            ) {

                const tag =
                    document.createElement(
                        "span"
                    );


                tag.className =
                    "sign-tag";


                tag.innerText =
                    "Automatic check · mock-up";


                body.appendChild(
                    tag
                );

            }



            if (
                sign.detail
            ) {

                const detail =
                    document.createElement(
                        "span"
                    );


                detail.className =
                    "sign-detail";


                detail.innerText =
                    sign.detail;


                body.appendChild(
                    detail
                );

            }



            const status =
                document.createElement(
                    "span"
                );


            status.className =
                "sign-status";


            status.innerText =
                STATUS[
                    sign.status
                ].label;



            li.append(
                icon,
                body,
                status
            );


            list.appendChild(
                li
            );

        }
    );

}



// --------------------------------------------------
// RESET FORM
// --------------------------------------------------

function resetForm() {

    document
        .getElementById(
            "address"
        )
        .value =
            "";


    document
        .getElementById(
            "listing"
        )
        .value =
            "";


    document
        .getElementById(
            "landlordName"
        )
        .value =
            "";


    document
        .querySelectorAll(
            ".risk-question"
        )
        .forEach(
            question => {

                question.value =
                    "";


                setError(
                    question,
                    false
                );

            }
        );


    document
        .querySelectorAll(
            ".info-btn"
        )
        .forEach(
            button => {

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );


                const hint =
                    document.getElementById(
                        button.getAttribute(
                            "aria-controls"
                        )
                    );


                if (
                    hint
                ) {

                    hint
                        .classList
                        .add(
                            "hidden"
                        );

                }

            }
        );


    document
        .getElementById(
            "form-error"
        )
        .classList
        .add(
            "hidden"
        );


    const result =
        document.getElementById(
            "result"
        );


    result
        .classList
        .add(
            "hidden"
        );


    document
        .getElementById(
            "signList"
        )
        .innerHTML =
            "";


    scrollToElement(
        document.querySelector(
            ".checker"
        )
    );


    document
        .getElementById(
            "address"
        )
        .focus({
            preventScroll:
                true
        });

}



// --------------------------------------------------
// INFO BUTTONS
// --------------------------------------------------

document
    .querySelectorAll(
        ".info-btn"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const hint =
                        document.getElementById(
                            button.getAttribute(
                                "aria-controls"
                            )
                        );


                    const open =
                        button.getAttribute(
                            "aria-expanded"
                        )
                        === "true";


                    button.setAttribute(

                        "aria-expanded",

                        open
                            ? "false"
                            : "true"

                    );


                    if (
                        hint
                    ) {

                        hint
                            .classList
                            .toggle(
                                "hidden",
                                open
                            );

                    }

                }
            );

        }
    );



// --------------------------------------------------
// REMOVE ERROR WHEN ANSWERED
// --------------------------------------------------

document
    .querySelectorAll(
        ".risk-question"
    )
    .forEach(
        question => {

            question.addEventListener(
                "change",
                () => {

                    const missing = (

                        !question.value
                        ||
                        question.selectedIndex
                            === 0

                    );


                    setError(
                        question,
                        missing
                    );


                    const stillMissing =
                        Array.from(
                            document.querySelectorAll(
                                ".risk-question"
                            )
                        )
                        .some(
                            other => (

                                !other.value
                                ||
                                other.selectedIndex
                                    === 0

                            )
                        );


                    if (
                        !stillMissing
                    ) {

                        document
                            .getElementById(
                                "form-error"
                            )
                            .classList
                            .add(
                                "hidden"
                            );

                    }

                }
            );

        }
    );



// --------------------------------------------------
// INITIALISE ADMIN PANEL
// --------------------------------------------------

buildAdminPanel();


document
    .getElementById(
        "adminToggle"
    )
    .addEventListener(
        "click",
        () => {

            setAdminMode(
                !adminState.enabled
            );

        }
    );


setAdminMode(
    adminState.enabled
);

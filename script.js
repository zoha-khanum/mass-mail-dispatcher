const csvFile = document.getElementById("csvFile");
const uploadBtn = document.getElementById("uploadBtn");

const validEmailsList = document.getElementById("validEmails");
const invalidEmailsList = document.getElementById("invalidEmails");

uploadBtn.addEventListener("click", function () {

    const file = csvFile.files[0];

    if (!file) {
        alert("Please select a CSV file first!");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        const csvData = event.target.result;

        const emails = csvData
            .split(/\r?\n/)
            .map(email => email.trim())
            .filter(email =>
                email !== "" &&
                email.toLowerCase() !== "email"
            );

        validEmailsList.innerHTML = "";
        invalidEmailsList.innerHTML = "";

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        emails.forEach(function (email) {

            const listItem = document.createElement("li");
            listItem.textContent = email;

            if (emailPattern.test(email)) {
                validEmailsList.appendChild(listItem);
            } else {
                invalidEmailsList.appendChild(listItem);
            }

        });

    };

    reader.readAsText(file);

});


const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", async function () {

    const subject = document.getElementById("subject").value;
    const message = document.getElementById("message").value;

    const validEmails = Array.from(
        document.querySelectorAll("#validEmails li")
    ).map(item => item.textContent);

    if (validEmails.length === 0) {
        alert("Please upload a CSV file first!");
        return;
    }

    if (!subject || !message) {
        alert("Please enter subject and message!");
        return;
    }

    try {

        const response = await fetch(
            "https://mass-mail-dispatcher-ybjz.onrender.com/send-email",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    emails: validEmails,
                    subject: subject,
                    message: message
                })
            }
        );

        const data = await response.json();

        alert(data.message);

    } catch (error) {

        console.error(error);

        alert("Unable to connect to the backend.");

    }

});
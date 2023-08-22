// All of the Node.js APIs are available in the preload process.

import { ipcRenderer } from "electron";

// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", () => {
  // To use the function and get the messages:
});

function extractMessages() {
  // Get the container of all messages
  const container = document.getElementById("messages-container");

  // Get all div elements inside the container
  const divElements: any = container.getElementsByTagName("div");

  // An array to store messages
  const messages = [];

  for (const div of divElements) {
    // Check if the div element has a direct child that's a text node
    if (div.childNodes.length && div.childNodes[0].nodeType === 3) {
      // Push the text content to the messages array
      messages.push(div.childNodes[0].nodeValue.trim());
    }
  }

  return messages;
}

function typeInput(input: string) {
  const inputForm = document.querySelector<HTMLTextAreaElement>(
    "textarea.form-control"
  );
  if (!inputForm) {
    console.error("Textarea not found");
    return;
  }

  // Set the value
  inputForm.innerText = input;

  // Trigger an input event
  const inputEvent = new Event("input", { bubbles: true });
  inputForm.dispatchEvent(inputEvent);

  // Trigger a change event
  const changeEvent = new Event("change", { bubbles: true });
  inputForm.dispatchEvent(changeEvent);

  // Invoke the sendEnter function
  sendEnter();
}

function sendEnter() {
  const submitBtn = document.querySelector<HTMLButtonElement>(
    "button#send-message-btn"
  );

  if (submitBtn) {
    // Directly invoke the click method
    submitBtn.click();

    // Simulate touchend event, common for mobile taps
    const touchEvent = new Event("touchend", { bubbles: true });
    submitBtn.dispatchEvent(touchEvent);
  } else {
    console.error("Button not found");
  }
}

(window as any).typeInput = typeInput;
(window as any).sendEnter = sendEnter;
(window as any).latestMessage = "";

// Interval
setInterval(() => {
  const messages = extractMessages();
  if (messages.length === 0) return;
  if (messages[messages.length - 2] === (window as any).latestMessage) {
    ipcRenderer.send("messages", messages, true);
    (window as any).latestMessage = "";
  } else ipcRenderer.send("messages", messages);
  return;
}, 10000);

setTimeout(() => {
  // reload
  location.reload();
}, 5 * 60 * 1000);

// Listen for the response from the main process
ipcRenderer.on("reply", (event, data) => {
  console.log("REPLY DATA:", data);
  (window as any).latestMessage = data;
  typeInput(data);
});

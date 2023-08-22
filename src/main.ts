import * as dotenv from "dotenv";
dotenv.config();

import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import axios from "axios";

async function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 428,
    height: 926,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false, // Important for IPC
    },
  });

  const opt = {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1 standalone",
  };
  // await mainWindow.loadURL("https://www.friend.tech", opt);
  await mainWindow.loadURL(
    "https://www.friend.tech/rooms/0x9793d62bdfb6a170cd68df9a19cbf021b8fd7d43",
    opt
  );

  // Open the DevTools.
  await mainWindow.webContents.openDevTools({
    mode: "detach",
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

interface CategorizedData {
  message: string;
  name: string;
  time: string;
}

ipcMain.on("messages", async (event, args, isLatest) => {
  const messages = args;

  if (isLatest) {
    fs.writeFileSync("messages.json", JSON.stringify(messages));
  } else if (fs.existsSync("messages.json")) {
    const oldMessages = JSON.parse(fs.readFileSync("messages.json", "utf-8"));

    const categorizedData: CategorizedData[] = categorizeData(messages);
    const latestMessage = categorizedData[categorizedData.length - 1];
    const oldCategorizedMessage = categorizeData(oldMessages);
    const oldLatestMessage =
      oldCategorizedMessage[oldCategorizedMessage.length - 1];
    if (oldLatestMessage.message === latestMessage.message) return;

    console.log(`[CHATGPT] ${latestMessage.name}: ${latestMessage.message}`);
    if (latestMessage.name === "superoo7 | Hooga 🍌") {
      fs.writeFileSync("messages.json", JSON.stringify(messages));
      return;
    }
    const spamDetection = await askGpt(
      `Act as a spam detector, I will give you a message, you will tell me whether it is spam or not.
Format the response as JSON like following:
{
  "spam": true
}`,
      latestMessage.message
    );
    const isSpam = JSON.parse(spamDetection).spam;
    if (isSpam === true) {
      event.sender.send(
        "reply",
        `@${latestMessage.name}: remind you to refrain from spamming within our friendtech group to maintain a positive and respectful environment 🚫⚖️`
      );
    } else {
      const replyMessage = await askGpt(
        `Based on user's message, please reply in all caps and super excited.
              
Reply answer in 1 sentence.`,
        `${latestMessage.name}: ${latestMessage.message}}`
      );
      const isReplySpamMessage = await askGpt(
        `Act as a spam detector, I will give you a message, you will tell me whether it is spam or not.
Format the response as JSON like following:
{
  "spam": true
}`,
        replyMessage
      );
      const isReplySpam = JSON.parse(isReplySpamMessage).spam;
      if (isReplySpam === true) {
        event.sender.send(
          "reply",
          `@${latestMessage.name}: remind you to refrain from spamming within our friendtech group to maintain a positive and respectful environment 🚫⚖️`
        );
      } else {
        event.sender.send("reply", replyMessage);
      }
    }
  } else {
    fs.writeFileSync("messages.json", JSON.stringify(messages));
  }
});

function categorizeData(data: string[]) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].includes("·")) {
      const [name, time] = data[i].split(" · ");
      result.push({
        message: data[i - 1],
        name: name.trim(),
        time: time.trim(),
      });
    }
  }
  return result;
}

const askGpt = async (systemMessage: string, userMessage: string) => {
  const data = await axios({
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    data: {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    },
  });
  return data.data.choices[0].message.content;
};

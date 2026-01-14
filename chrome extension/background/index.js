const defaults = {
  method: "crop",
  format: "png",
  quality: 100,
  scaling: true,
  save: ["file"],
  clipboard: "url",
  dialog: true,
  icon: "default",
  endpoint: "http://localhost:3000/search",
  requestTimeout: 10000,
  delay: 150,
  maxScrolls: 30,
};

const hydrateConfig = (store) => {
  const config = {};
  Object.assign(config, defaults, JSON.parse(JSON.stringify(store)));
  if (typeof config.save === "string") {
    config.clipboard = /url|binary/.test(config.save) ? config.save : "url";
    config.save = /url|binary/.test(config.save) ? ["clipboard"] : ["file"];
  }
  if (config.dpr !== undefined) {
    config.scaling = config.dpr;
    delete config.dpr;
  }
  if (typeof config.icon === "boolean") {
    config.icon = config.icon === false ? "default" : "light";
  }
  if (!config.endpoint) {
    config.endpoint = defaults.endpoint;
  }
  if (!config.requestTimeout) {
    config.requestTimeout = defaults.requestTimeout;
  }
  return config;
};

const cacheConfig = (config) =>
  chrome.storage.sync.set(config, () => {
    chrome.action.setIcon({
      path: [16, 19, 38, 48, 128].reduce(
        (all, size) => (
          (all[size] = `/icons/${config.icon}/${size}x${size}.png`), all
        ),
        {}
      ),
    });
  });

const getConfig = () =>
  new Promise((resolve) => {
    chrome.storage.sync.get((store) => {
      const cfg = hydrateConfig(store);
      cacheConfig(cfg);
      resolve(cfg);
    });
  });

const notifyActiveTab = (message) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const active = tabs[0];
    if (!active) return;
    chrome.tabs.sendMessage(active.id, { message: "notify", text: message }, () => {
      if (chrome.runtime.lastError) {
        console.warn("notify fallback", chrome.runtime.lastError.message);
      }
    });
  });
};

const openHtmlTab = (htmlContent) => {
  chrome.tabs.create({
    url: "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent),
  });
};

async function postData(image) {
  const config = await getConfig();
  const formData = new FormData();
  formData.append("image", image);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeout);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      notifyActiveTab("Search failed: " + (response.statusText || "Bad response"));
      return;
    }

    openHtmlTab(text);
  } catch (error) {
    notifyActiveTab("Could not reach search service. Check connection.");
    console.error("Search error", error);
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request.type === "search") {
    postData(request.image);
  }
});

getConfig();

function inject(tab) {
  chrome.tabs.sendMessage(tab.id, { message: "init" }, (res) => {
    if (res) {
      clearTimeout(timeout);
    }
  });

  var timeout = setTimeout(() => {
    chrome.scripting.insertCSS({
      files: ["vendor/jquery.Jcrop.min.css"],
      target: { tabId: tab.id },
    });
    chrome.scripting.insertCSS({
      files: ["content/index.css"],
      target: { tabId: tab.id },
    });

    chrome.scripting.executeScript({
      files: ["vendor/jquery.min.js"],
      target: { tabId: tab.id },
    });
    chrome.scripting.executeScript({
      files: ["vendor/jquery.Jcrop.min.js"],
      target: { tabId: tab.id },
    });
    chrome.scripting.executeScript({
      files: ["content/crop.js"],
      target: { tabId: tab.id },
    });
    chrome.scripting.executeScript({
      files: ["content/index.js"],
      target: { tabId: tab.id },
    });

    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { message: "init" });
    }, 100);
  }, 100);
}

chrome.action.onClicked.addListener((tab) => {
  inject(tab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "take-screenshot") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
      inject(tab[0]);
    });
  }
});

chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === "capture") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
      chrome.tabs.captureVisibleTab(
        tab.windowId,
        { format: req.format, quality: req.quality },
        (image) => {
          res({ message: "image", image });
        }
      );
    });
  } else if (req.message === "active") {
    if (req.active) {
      chrome.storage.sync.get((config) => {
        if (config.method === "crop") {
          chrome.action.setTitle({
            tabId: sender.tab.id,
            title: "Crop and Save",
          });
          chrome.action.setBadgeText({ tabId: sender.tab.id, text: "◩" });
        } else if (config.method === "wait") {
          chrome.action.setTitle({
            tabId: sender.tab.id,
            title: "Crop and Wait",
          });
          chrome.action.setBadgeText({ tabId: sender.tab.id, text: "◪" });
        } else if (config.method === "view") {
          chrome.action.setTitle({
            tabId: sender.tab.id,
            title: "Capture Viewport",
          });
          chrome.action.setBadgeText({ tabId: sender.tab.id, text: "⬒" });
        } else if (config.method === "page") {
          chrome.action.setTitle({
            tabId: sender.tab.id,
            title: "Capture Document",
          });
          chrome.action.setBadgeText({ tabId: sender.tab.id, text: "◼" });
        }
      });
    } else {
      chrome.action.setTitle({
        tabId: sender.tab.id,
        title: "Screenshot Capture",
      });
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: "" });
    }
  }
  return true;
});

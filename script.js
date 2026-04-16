const WORKER_URL = "https://luigi.ethancobler.workers.dev";

const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const generateBtn = document.getElementById("generateRoutine");
const selectedProductsList = document.getElementById("selectedProductsList");

const selectedProducts = new Set();
let allProducts = [];

const conversationHistory = [
  {
    role: "system",
    content:
      "You are an elegant and helpful L'Oréal beauty advisor. You help users build personalized routines using their selected products. Only discuss topics related to skincare, haircare, makeup, and fragrance. Be warm, concise, and professional. Keep responses to 3-5 sentences unless the user asks for more.",
  },
];

productsContainer.innerHTML = `<div class="placeholder-message">Select a category to view products</div>`;

async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${selectedProducts.has(product.id) ? 'selected' : ''}" 
         id="card-${product.id}" 
         onclick="toggleProduct('${product.id}')">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <p class="product-description">${product.description || ''}</p>
      </div>
    </div>
  `
    )
    .join("");
}

function updateSelectedList() {
  const details = allProducts.filter((p) => selectedProducts.has(p.id));
  if (details.length === 0) {
    selectedProductsList.innerHTML = `<p style="color:#666;font-size:14px;">No products selected yet.</p>`;
    return;
  }
  selectedProductsList.innerHTML = details
    .map(
      (p) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid #ccc;border-radius:4px;font-size:14px;">
      <span>${p.name}</span>
      <button onclick="removeProduct(${p.id})" style="background:none;border:none;cursor:pointer;color:#ff003b;font-size:16px;">✕</button>
    </div>
  `
    )
    .join("");
}

function saveToLocalStorage() {
  localStorage.setItem("selectedProducts", JSON.stringify([...selectedProducts]));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    JSON.parse(saved).forEach((id) => selectedProducts.add(id));
  }
}

function toggleProduct(id) {
  id = Number(id);
  const product = allProducts.find((p) => p.id === id);
  if (product) {
    if (selectedProducts.has(id)) {
      selectedProducts.delete(id);
    } else {
      selectedProducts.add(id);
    }
    const card = document.getElementById(`card-${id}`);
    card.classList.toggle("selected");
    updateSelectedList();
    saveToLocalStorage();
  }
}

function removeProduct(id) {
  selectedProducts.delete(id);
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.remove("selected");
  updateSelectedList();
  saveToLocalStorage();
}

categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;
  allProducts = await loadProducts();
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
});

function appendMessage(role, content) {
  const div = document.createElement("div");
  div.classList.add("msg", role === "user" ? "user" : "ai");
  if (role === "user") {
    div.textContent = `You: ${content}`;
  } else {
    div.innerHTML = `<strong>L'Oréal Advisor:</strong> ` + marked.parse(content);
  }
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
  const div = document.createElement("div");
  div.classList.add("msg", "ai");
  div.id = "typingIndicator";
  div.textContent = "L'Oréal Advisor is typing...";
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) indicator.remove();
}

async function getAIResponse() {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: conversationHistory }),
  });
  if (!response.ok) throw new Error(`Worker responded with status ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userText = userInput.value.trim();
  if (!userText) return;
  appendMessage("user", userText);
  userInput.value = "";
  sendBtn.disabled = true;
  conversationHistory.push({ role: "user", content: userText });
  showTypingIndicator();
  try {
    const aiText = await getAIResponse();
    conversationHistory.push({ role: "assistant", content: aiText });
    removeTypingIndicator();
    appendMessage("assistant", aiText);
  } catch (err) {
    removeTypingIndicator();
    appendMessage("assistant", "Sorry, something went wrong. Please try again.");
    console.error("API Error:", err);
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
});

generateBtn.addEventListener("click", async () => {
  if (selectedProducts.size === 0) {
    alert("Please select at least one product to generate a routine.");
    return;
  }
  const selectedProductDetails = allProducts.filter((p) => selectedProducts.has(p.id));
  const productSummaries = selectedProductDetails
    .map((p) => `${p.name} by ${p.brand} (${p.category}): ${p.description || ''}`)
    .join("\n");
  const prompt = `Please create a personalized beauty routine using these selected products:\n${productSummaries}\n\nFormat it as a step-by-step routine with brief instructions for each product.`;
  conversationHistory.push({ role: "user", content: prompt });
  showTypingIndicator();
  try {
    const aiText = await getAIResponse();
    conversationHistory.push({ role: "assistant", content: aiText });
    removeTypingIndicator();
    appendMessage("assistant", aiText);
  } catch (err) {
    removeTypingIndicator();
    appendMessage("assistant", "Sorry, something went wrong. Please try again.");
    console.error("API Error:", err);
  }
});

loadFromLocalStorage();
updateSelectedList();

appendMessage(
  "assistant",
  "Hey, I'm your L'Oréal beauty advisor! Select some products and hit Generate Routine, or ask me anything about skincare, haircare, makeup, or fragrance."
);
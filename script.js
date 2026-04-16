const WORKER_URL = "https://luigi.ethancobler.workers.dev";

/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const generateButton = document.getElementById("generateRoutine");

const selectedProducts = new Set();
let allProducts = [];

const conversationHistory = [
  {
    role: "system",
    content:
      "You are an elegant and helpful L'Oréal beauty advisor. You help users build personalized routines using their selected products. Only discuss topics related to skincare, haircare, makeup, and fragrance. Be warm, concise, and professional. Keep responses to 3-5 sentences unless the user asks for more.",
  },
];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" onclick="toggleProduct('${product.id}')" id="card-${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `,
    )
    .join("");
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
  }

  const card = document.getElementById(`card-${id}`);

  card.classList.toggle("selected");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;
  allProducts = await loadProducts();

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

function appendMessage(role, content) {
  const div = document.createElement("div");
  div.classList.add("msg", role === "user" ? "user" : "ai");
  const label = role === "user" ? "You: " : "L'Oréal Advisor: ";
  div.textContent = `${label}${content}`;
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
  if (!response.ok)
    throw new Error(`Worker responded with status ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userText = userInput.value.trim();

  if (!userText) return;

  appendMessage("user", userText);
  userInput.value = "";
  sendButton.disabled = true;
  conversationHistory.push({ role: "user", content: userText });
  showTypingIndicator();

  try {
    const aiText = await getAIResponse();

    conversationHistory.push({ role: "assistant", content: aiText });
    removeTypingIndicator();
    appendMessage("assistant", aiText);
  } catch (error) {
    removeTypingIndicator;
    console.error("Sorry, something went wrong. Please try again");
    console.error("API Error:", error);
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
});

appendMessage(
  "assistant",
  "Hey, I'm your L'Oréal beauty advisor! Select some products and hit Generate Routine, or ask me anything about skincare, haircare, makeup, or fragrance.",
);

function generateRoutine() {
  if (selectedProducts.size === 0) {
    alert("Please select at least one product to generate a routine.");
    return;
  }

  const selectedProductDetails = allProducts.filter((product) =>
    selectedProducts.has(product.id),
  );

  const productNames = selectedProductDetails.map((p) => p.name).join(", ");

  const prompt = `Based on the following selected products: ${productNames}, please create a personalized beauty routine for the user. Keep it concise and actionable. Format it well for easy reading.`;

  conversationHistory.push({ role: "user", content: prompt });
  showTypingIndicator();
  getAIResponse()
    .then((aiText) => {
      conversationHistory.push({ role: "assistant", content: aiText });
      removeTypingIndicator();
      appendMessage("assistant", aiText);
    })
    .catch((error) => {
      removeTypingIndicator();
      console.error("Sorry, something went wrong. Please try again");
      console.error("API Error:", error);
    });
}

generateButton.addEventListener("click", generateRoutine);

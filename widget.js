/**
 * widget.js
 * A premium, self-contained embeddable Web Chat Widget.
 * Injects a stunning glassmorphic chat bubble and dialog interface into any HTML page.
 * Powered by ChatbotSimulator (simulator.js) context-matching and stateful lead intake!
 */

(function () {
  // Prevent duplicate initialization
  if (window.AgenticAI) return;

  const CSS_STYLES = `
    /* Floating Chat Bubble Button */
    .agentic-widget-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
      box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .agentic-widget-bubble:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 6px 24px rgba(168, 85, 247, 0.55);
    }
    .agentic-widget-bubble i {
      font-size: 24px;
      color: #ffffff;
      transition: all 0.3s ease;
    }
    .agentic-widget-bubble.active i {
      transform: rotate(90deg) scale(0.8);
    }
    /* Pulsing online indicator */
    .agentic-widget-bubble::after {
      content: "";
      position: absolute;
      top: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #10b981;
      border: 2px solid #ffffff;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
      animation: agenticPulse 2s infinite;
    }
    @keyframes agenticPulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* Floating Chat Dialog Window */
    .agentic-widget-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 370px;
      height: 530px;
      max-height: calc(100vh - 120px);
      max-width: calc(100vw - 48px);
      border-radius: 16px;
      background: rgba(18, 18, 22, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .agentic-widget-window.active {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* Widget Header */
    .agentic-widget-header {
      background: rgba(26, 26, 36, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .agentic-widget-profile {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .agentic-widget-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .agentic-widget-details h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #f4f4f5;
    }
    .agentic-widget-details p {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .agentic-widget-details p::before {
      content: "";
      display: inline-block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: #10b981;
    }
    .agentic-widget-close {
      background: none;
      border: none;
      color: #a1a1aa;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      transition: color 0.2s;
    }
    .agentic-widget-close:hover {
      color: #f4f4f5;
    }

    /* Widget Chat Body */
    .agentic-widget-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      background-color: #0c0c0e;
    }
    /* Scrollbar for Widget Body */
    .agentic-widget-body::-webkit-scrollbar {
      width: 5px;
    }
    .agentic-widget-body::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }
    .agentic-widget-body::-webkit-scrollbar-thumb {
      background: rgba(168, 85, 247, 0.4);
      border-radius: 10px;
    }
    
    /* Chat Bubbles */
    .agentic-widget-bubble-msg {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 12.5px;
      line-height: 1.45;
      word-wrap: break-word;
      animation: agenticPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .agentic-widget-bubble-msg.bot {
      background-color: #1a1a24;
      color: #f4f4f5;
      align-self: flex-start;
      border-bottom-left-radius: 2px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .agentic-widget-bubble-msg.user {
      background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
    }
    .agentic-widget-bubble-msg.system {
      background-color: rgba(6, 182, 212, 0.08);
      border: 1px dashed rgba(6, 182, 212, 0.25);
      color: #06b6d4;
      align-self: center;
      text-align: center;
      max-width: 90%;
      font-size: 11px;
      border-radius: 8px;
    }
    @keyframes agenticPopIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Widget Input Bar */
    .agentic-widget-input-bar {
      background: #121216;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 12px;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .agentic-widget-input {
      flex: 1;
      background-color: #09090b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 8px 16px;
      color: #f4f4f5;
      font-size: 12.5px;
      outline: none;
      transition: border-color 0.25s;
    }
    .agentic-widget-input:focus {
      border-color: #a855f7;
    }
    .agentic-widget-send {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
      border: none;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .agentic-widget-send:hover {
      transform: scale(1.05);
    }
    .agentic-widget-send i {
      font-size: 12px;
    }
    
    /* Branding */
    .agentic-widget-branding {
      text-align: center;
      padding: 4px;
      font-size: 9px;
      color: #71717a;
      background-color: #121216;
      border-top: 1px solid rgba(255, 255, 255, 0.02);
      letter-spacing: 0.3px;
    }
    .agentic-widget-branding a {
      color: #a855f7;
      text-decoration: none;
      font-weight: 500;
    }
  `;

  class WidgetController {
    constructor() {
      this.name = "SolopreneurBot";
      this.vibe = "professional";
      this.avatar = "🤖";
      this.leadFields = { name: true, email: true, budget: true, scope: true };
      
      this.simulator = null;
      this.bubbleEl = null;
      this.windowEl = null;
      this.chatBodyEl = null;
      this.inputEl = null;
      
      this.isOpen = false;
      this.isInitialized = false;
    }

    init(options = {}) {
      if (this.isInitialized) return;
      
      this.name = options.name || this.name;
      this.vibe = options.vibe || this.vibe;
      this.avatar = options.avatar || this.avatar;
      this.leadFields = options.leadFields || this.leadFields;
      
      // Inject CSS
      const styleEl = document.createElement("style");
      styleEl.innerHTML = CSS_STYLES;
      document.head.appendChild(styleEl);

      // Make sure font-awesome is loaded for icons
      if (!document.querySelector("link[href*='font-awesome']")) {
        const faLink = document.createElement("link");
        faLink.rel = "stylesheet";
        faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        document.head.appendChild(faLink);
      }

      // Check and load simulator.js dynamically if not already loaded
      if (window.ChatbotSimulator) {
        this.startWidget();
      } else {
        const simScript = document.createElement("script");
        simScript.src = "/simulator.js";
        simScript.onload = () => this.startWidget();
        document.head.appendChild(simScript);
      }

      this.isInitialized = true;
    }

    startWidget() {
      // 1. Create RAG Simulator Instance
      this.simulator = new window.ChatbotSimulator({
        name: this.name,
        vibe: this.vibe,
        leadFields: this.leadFields,
        onLeadCaptured: (leadData) => this.handleLeadCaptured(leadData)
      });

      // 2. Build DOM structures
      this.buildDOM();
      this.bindEvents();
      this.setupInitialChat();
    }

    buildDOM() {
      // Create Bubble Button
      this.bubbleEl = document.createElement("div");
      this.bubbleEl.className = "agentic-widget-bubble";
      this.bubbleEl.innerHTML = `<i class="fa-solid fa-comment-dots"></i>`;
      document.body.appendChild(this.bubbleEl);

      // Create Window Dialog
      this.windowEl = document.createElement("div");
      this.windowEl.className = "agentic-widget-window";
      this.windowEl.innerHTML = `
        <div class="agentic-widget-header">
          <div class="agentic-widget-profile">
            <div class="agentic-widget-avatar">${this.avatar}</div>
            <div class="agentic-widget-details">
              <h4>${this.name}</h4>
              <p>Active Now</p>
            </div>
          </div>
          <button class="agentic-widget-close" aria-label="Close Chat"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="agentic-widget-body" id="agentic-chat-body"></div>
        <form class="agentic-widget-input-bar" id="agentic-chat-form">
          <input type="text" class="agentic-widget-input" placeholder="Type a message..." autocomplete="off">
          <button type="submit" class="agentic-widget-send">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
        <div class="agentic-widget-branding">Powered by <a href="#" target="_blank">AgenticAI</a></div>
      `;
      document.body.appendChild(this.windowEl);
      
      this.chatBodyEl = this.windowEl.querySelector("#agentic-chat-body");
      this.inputEl = this.windowEl.querySelector(".agentic-widget-input");
    }

    bindEvents() {
      // Bubble Toggle
      this.bubbleEl.addEventListener("click", () => this.toggleWindow());
      
      // Close Button
      this.windowEl.querySelector(".agentic-widget-close").addEventListener("click", () => this.toggleWindow(false));

      // Form Chat Submission
      this.windowEl.querySelector("#agentic-chat-form").addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitMessage();
      });
    }

    toggleWindow(forceState = null) {
      this.isOpen = forceState !== null ? forceState : !this.isOpen;
      
      if (this.isOpen) {
        this.bubbleEl.classList.add("active");
        this.bubbleEl.innerHTML = `<i class="fa-solid fa-chevron-down"></i>`;
        this.windowEl.classList.add("active");
        setTimeout(() => this.inputEl.focus(), 150);
      } else {
        this.bubbleEl.classList.remove("active");
        this.bubbleEl.innerHTML = `<i class="fa-solid fa-comment-dots"></i>`;
        this.windowEl.classList.remove("active");
      }
    }

    setupInitialChat() {
      this.chatBodyEl.innerHTML = `
        <div class="agentic-widget-bubble-msg system">
          ⚙️ Connected to ${this.name} (${this.vibe.toUpperCase()} vibe)
        </div>
        <div class="agentic-widget-bubble-msg bot">
          ${this.simulator.getGreeting()}
        </div>
      `;
      this.chatBodyEl.scrollTop = this.chatBodyEl.scrollHeight;
    }

    appendMsg(text, sender) {
      const bubble = document.createElement("div");
      bubble.className = `agentic-widget-bubble-msg ${sender}`;
      
      let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      bubble.innerHTML = formatted;
      this.chatBodyEl.appendChild(bubble);
      this.chatBodyEl.scrollTop = this.chatBodyEl.scrollHeight;
    }

    submitMessage() {
      const query = this.inputEl.value.trim();
      if (!query) return;

      // Render User Msg
      this.appendMsg(query, "user");
      this.inputEl.value = "";

      // Render Thinking state
      const thinking = document.createElement("div");
      thinking.className = "agentic-widget-bubble-msg bot";
      thinking.style.opacity = "0.7";
      thinking.innerHTML = `<i class="fa-solid fa-ellipsis fa-pulse"></i> Thinking...`;
      this.chatBodyEl.appendChild(thinking);
      this.chatBodyEl.scrollTop = this.chatBodyEl.scrollHeight;

      setTimeout(() => {
        thinking.remove();
        const reply = this.simulator.processMessage(query);
        this.appendMsg(reply, "bot");
      }, Math.random() * 400 + 400);
    }

    handleLeadCaptured(leadData) {
      // 1. Sync channel name
      leadData.channel = "Web Widget";

      // 2. Save directly to browser localStorage so dashboard picks it up instantly!
      let leads = [];
      const stored = localStorage.getItem('agentic_freelance_leads');
      if (stored) {
        leads = JSON.parse(stored);
      }
      leads.unshift(leadData);
      localStorage.setItem('agentic_freelance_leads', JSON.stringify(leads));

      // 3. Optional: Sync to leads.json on disk if running locally via a server API callback
      // We perform a POST request to a mock or self-serving file if supported, or rely on localStorage!
      fetch('/leads.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      }).catch(() => {
        // Safe to ignore in sandbox-only modes, as localStorage is immediately active!
      });

      // 4. Render a system bubble
      setTimeout(() => {
        this.appendMsg(`System: 🚀 Lead synchronized! Thank you.`, "system");
        
        // Dispatch custom event to notify dashboard if it is open in the same window
        window.dispatchEvent(new CustomEvent("agentic_lead_captured", { detail: leadData }));
      }, 800);
    }
  }

  // Create and expose global loader object
  window.AgenticAI = new WidgetController();
})();

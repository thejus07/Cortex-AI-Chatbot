/**
 * app.js
 * Visual controller and state manager for the AI Chatbot Setup Agent dashboard.
 */

// Core Application State
let currentStep = 1;
let activeView = 'creator';
let botName = 'SolopreneurBot';
let botAvatar = '🤖';
let botVibe = 'professional';
let botContext = '';
let leadFields = { name: true, email: true, budget: true, scope: true };
let leadsList = [];
let activeChannel = 'widget';
let isDeploying = false;

let simulatorInstance = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup default context (Developer)
  botContext = window.KNOWLEDGE_TEMPLATES.developer;
  const kbTextarea = document.getElementById('knowledge-base-context');
  if (kbTextarea) {
    kbTextarea.value = botContext;
  }
  
  // Set default active template button
  const devTemplateBtn = document.querySelector('.template-btn');
  if (devTemplateBtn) devTemplateBtn.classList.add('active');

  // 2. Load Leads from LocalStorage
  loadLeads();

  // 3. Initialize Simulator
  simulatorInstance = new window.ChatbotSimulator({
    name: botName,
    vibe: botVibe,
    context: botContext,
    leadFields: leadFields,
    onLeadCaptured: (leadData) => {
      saveLead(leadData);
    }
  });

  // 4. Setup listeners & initial states
  setupListeners();
  updateRightPreviewHeader();
  renderLeads();
  initChatLogs();
});

// Setup DOM event listeners
function setupListeners() {
  // Dynamic Bot Name Syncer
  const nameInput = document.getElementById('bot-name');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      botName = e.target.value.trim() || 'SolopreneurBot';
      updateRightPreviewHeader();
      
      // Update chatbot config
      simulatorInstance.updateConfig(botName, botVibe, botContext, leadFields);
      
      // Re-render code snippet dynamically to reflect current name
      updateEmbedSnippet();
    });
  }

  // Knowledge Base text input syncer
  const kbTextarea = document.getElementById('knowledge-base-context');
  if (kbTextarea) {
    kbTextarea.addEventListener('input', (e) => {
      botContext = e.target.value;
      simulatorInstance.updateConfig(botName, botVibe, botContext, leadFields);
    });
  }
}

// Global Navigation: Switch Main Dashboard Views
window.switchView = function(view) {
  activeView = view;
  
  // Toggle navigation active class
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeNavItem = document.getElementById(`nav-${view}`);
  if (activeNavItem) activeNavItem.classList.add('active');

  // Toggle visible sections
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(`view-${view}`);
  if (activeSec) activeSec.classList.add('active');

  // Specific dashboard transitions
  if (view === 'dashboard') {
    loadLeads();
    renderLeads();
  }
};

// Wizard Step Navigation
window.navigateStep = function(direction) {
  if (isDeploying) return; // Prevent navigation while simulating deployment

  const newStep = currentStep + direction;
  
  if (newStep < 1 || newStep > 4) return;

  // Step Validations
  if (direction > 0) {
    if (currentStep === 1) {
      if (botName.trim() === '') {
        alert('Please give your chatbot a name before proceeding.');
        return;
      }
    }
    if (currentStep === 2) {
      if (botContext.trim() === '') {
        alert('Please provide some training knowledge context or select a template.');
        return;
      }
    }
  }

  // Deactivate current step visual states
  document.getElementById(`step-card-${currentStep}`).classList.remove('active');
  document.getElementById(`step-ind-${currentStep}`).classList.remove('active');
  if (direction > 0) {
    document.getElementById(`step-ind-${currentStep}`).classList.add('completed');
  }

  currentStep = newStep;

  // Activate new step visual states
  document.getElementById(`step-card-${currentStep}`).classList.add('active');
  document.getElementById(`step-ind-${currentStep}`).classList.add('active');
  document.getElementById(`step-ind-${currentStep}`).classList.remove('completed');

  // Handle Wizard Controls/Buttons
  const backBtn = document.getElementById('btn-back');
  const nextBtn = document.getElementById('btn-next');

  backBtn.disabled = currentStep === 1;

  if (currentStep === 4) {
    nextBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Deploy Chatbot';
    nextBtn.classList.add('btn-primary');
  } else {
    nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
  }

  // If going back to a step, remove its 'completed' state
  for (let s = currentStep; s <= 4; s++) {
    document.getElementById(`step-ind-${s}`).classList.remove('completed');
  }

  // Handle step-specific setups
  if (currentStep === 4) {
    updateEmbedSnippet();
  }
};

// Step 1: Avatar Selector
window.selectAvatar = function(avatar, element) {
  botAvatar = avatar;
  
  // Update selected class
  document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('active'));
  element.classList.add('active');

  updateRightPreviewHeader();
  
  // Reboot chat preview with visual system notice
  triggerBotRebootNotice();
};

// Step 1: Vibe/Personality Selector
window.selectVibe = function(vibe, element) {
  botVibe = vibe;

  // Update selected class
  document.querySelectorAll('.vibe-card').forEach(el => el.classList.remove('active'));
  element.classList.add('active');

  simulatorInstance.updateConfig(botName, botVibe, botContext, leadFields);
  updateEmbedSnippet();

  // Reboot chat preview
  triggerBotRebootNotice();
};

// Step 2: Apply Template pre-fills
window.applyTemplate = function(type, element) {
  // Update active template button CSS
  document.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');

  // Fill text
  botContext = window.KNOWLEDGE_TEMPLATES[type];
  document.getElementById('knowledge-base-context').value = botContext;

  // Sync simulator
  simulatorInstance.updateConfig(botName, botVibe, botContext, leadFields);

  // System notice in chat
  appendChatBubble(`System: 🧠 Bot knowledge re-trained with **${type.toUpperCase()}** parameters. Try asking about capabilities!`, 'system');
};

// Step 3: Toggle Lead capture checkbox fields
window.toggleLeadField = function(field) {
  const checkbox = document.getElementById(`lead-${field}`);
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
    leadFields[field] = checkbox.checked;
    
    // Sync simulator
    simulatorInstance.updateConfig(botName, botVibe, botContext, leadFields);
  }
};

// Step 4: Channel Selector
window.selectChannel = function(channel, element) {
  activeChannel = channel;

  // Update class active
  document.querySelectorAll('.channel-card').forEach(el => el.classList.remove('active'));
  element.classList.add('active');

  updateEmbedSnippet();
};

// Update Embed script block in Step 4
function updateEmbedSnippet() {
  const snippet = document.getElementById('snippet-code');
  if (!snippet) return;

  if (activeChannel === 'widget') {
    snippet.textContent = `<!-- AgenticAI Loader -->
<script src="https://cdn.agentic.ai/widget.js"></script>
<script>
  AgenticAI.init({
    botId: "bot_fl_${Math.random().toString(16).substring(2, 10)}",
    name: "${botName}",
    vibe: "${botVibe}",
    leadCapture: ${JSON.stringify(leadFields)}
  });
</script>`;
  } else if (activeChannel === 'whatsapp') {
    snippet.textContent = `// WhatsApp Cloud API Webhook Core
const whatsAppConfig = {
  phoneId: "1098273645",
  verifyToken: "agent_handshake_${botName.toLowerCase()}",
  assistantConfig: {
    name: "${botName}",
    vibe: "${botVibe}"
  }
};`;
  } else {
    snippet.textContent = `# Telegram BotFather Deployment Config
TOKEN = "628371946:AAH_gK641kX928_dev_${botName.toLowerCase()}"
PERSISTENT_VIBE = "${botVibe}"
LEADS_TARGET = "leads_email_agent"`;
  }
}

// Global Trigger Next Button (which runs Deploy Chatbot on Step 4)
const originalNextClick = window.navigateStep;
window.navigateStep = function(direction) {
  if (currentStep === 4 && direction > 0) {
    // Run Deployment flow instead of navigating
    triggerDeployment();
  } else {
    originalNextClick(direction);
  }
};

// DevOps Terminal Deployment Simulator Flow
function triggerDeployment() {
  if (isDeploying) return;
  isDeploying = true;
  
  const terminal = document.getElementById('deploy-terminal');
  const codeBlock = document.getElementById('deployment-snippet-box');
  const nextBtn = document.getElementById('btn-next');
  const backBtn = document.getElementById('btn-back');
  const inlineBtn = document.getElementById('btn-deploy-inline');

  nextBtn.disabled = true;
  backBtn.disabled = true;
  if (inlineBtn) {
    inlineBtn.disabled = true;
    inlineBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deploying Chatbot...';
  }
  codeBlock.style.display = 'none';

  // Clear console, print start log
  terminal.innerHTML = '';
  
  const logs = [
    { text: '⚠️ [DEPLOY PIPELINE RUNNING] Triggering serverless compilation...', type: 'warning' },
    { text: `⚡ [INFO] Reading deployment schema configuration... Channel=${activeChannel.toUpperCase()}`, type: 'info' },
    { text: `🛠️ [INFO] Initializing model parameters (Name: ${botName}, Tone: ${botVibe.toUpperCase()})`, type: 'info' },
    { text: `🧠 [INFO] Compiling context vectors. Size of KB context: ${botContext.length} characters...`, type: 'info' },
    { text: '💾 [INFO] Connecting SQLite cloud instance for leads retention...', type: 'info' },
    { text: '🔗 [INFO] Registering active webhook callback endpoints...', type: 'info' },
    { text: '🔑 [INFO] Encrypting SSL handshake protocols & API access credentials...', type: 'info' },
    { text: '🚀 [INFO] Compiling final containerized production build packages...', type: 'info' },
    { text: '✅ [SUCCESS] Production server container active in edge clusters.', type: 'success' },
    { text: `🎉 [SUCCESS] DEPLOYMENT COMPLETE! ${botName} is now live and fully operations.`, type: 'header' }
  ];

  let logIndex = 0;
  
  function printNextLog() {
    if (logIndex < logs.length) {
      const log = logs[logIndex];
      const line = document.createElement('div');
      line.className = `terminal-line ${log.type}`;
      line.innerHTML = log.text;
      terminal.appendChild(line);
      
      // Auto scroll terminal
      terminal.scrollTop = terminal.scrollHeight;
      
      logIndex++;
      
      // Variable speed delays for premium tech feel
      const delay = log.type === 'success' || log.type === 'header' ? 1200 : Math.random() * 400 + 200;
      setTimeout(printNextLog, delay);
    } else {
      // Completed Deploy Flow
      isDeploying = false;
      nextBtn.disabled = false;
      backBtn.disabled = false;
      
      const inlineBtn = document.getElementById('btn-deploy-inline');
      if (inlineBtn) {
        inlineBtn.disabled = false;
        inlineBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Redeploy Chatbot 🚀';
      }
      
      // Show code snippet box
      codeBlock.style.display = 'block';
      codeBlock.classList.add('fadeIn');
      
      // Add a system bubble to playground chat
      appendChatBubble(`System: 🚀 Deployment completed! Bot instances connected online. Channel API configured for ${activeChannel.toUpperCase()}.`, 'system');
      
      // Update deployments counter in Dashboard
      const deploysCounter = document.getElementById('stat-active-deploys');
      if (deploysCounter) {
        deploysCounter.textContent = parseInt(deploysCounter.textContent) + 1;
      }
    }
  }

  printNextLog();
}

// Right Preview: Copy Embed Widget Code
window.copySnippet = function() {
  const code = document.getElementById('snippet-code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    const copyBtn = document.querySelector('.copy-btn');
    copyBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Copied!';
    setTimeout(() => {
      copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Code';
    }, 2000);
  });
};

// Right Preview Chat Screen Handlers
function updateRightPreviewHeader() {
  document.getElementById('preview-name').textContent = botName;
  document.getElementById('preview-avatar').textContent = botAvatar;
}

function initChatLogs() {
  const chatScreen = document.getElementById('preview-chat-screen');
  if (!chatScreen) return;

  chatScreen.innerHTML = `
    <div class="chat-bubble system">
      ⚙️ Bot initialized with <strong>${botVibe}</strong> personality & knowledge base.
    </div>
    <div class="chat-bubble bot">
      Hello! I am your customized AI assistant, **${botName}**. How can I help you with our freelance services today? If you are looking to hire us, just let me know!
    </div>
  `;
  chatScreen.scrollTop = chatScreen.scrollHeight;
}

function triggerBotRebootNotice() {
  appendChatBubble(`System: ⚙️ Bot parameters updated. Model re-booted with **${botVibe}** personality & updated credentials.`, 'system');
  
  if (simulatorInstance) {
    simulatorInstance.resetSession();
  }
}

function appendChatBubble(text, sender) {
  const chatScreen = document.getElementById('preview-chat-screen');
  if (!chatScreen) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  
  // Format markdown-like bold strings properly
  let formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
  bubble.innerHTML = formattedText;
  chatScreen.appendChild(bubble);
  
  // Smooth scroll to bottom
  chatScreen.scrollTop = chatScreen.scrollHeight;
}

// Handle Chat Message Submission
window.handleChatSubmit = function(event) {
  event.preventDefault();
  
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  // 1. Render User Message
  appendChatBubble(msg, 'user');
  input.value = '';

  // 2. Process message using the simulator client engine
  if (simulatorInstance) {
    // Show typing mock state
    const chatScreen = document.getElementById('preview-chat-screen');
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble bot typing-mock';
    typingBubble.innerHTML = 'Thinking...';
    chatScreen.appendChild(typingBubble);
    chatScreen.scrollTop = chatScreen.scrollHeight;

    setTimeout(() => {
      // Remove typing indicator
      typingBubble.remove();

      // Retrieve bot response
      const botResponse = simulatorInstance.processMessage(msg);
      appendChatBubble(botResponse, 'bot');
    }, Math.random() * 400 + 400); // 400-800ms natural response latency
  }
};

// Leads & Persistent Database Logic (localStorage + Server leads.json)
async function loadLeads() {
  const stored = localStorage.getItem('agentic_freelance_leads');
  if (stored) {
    leadsList = JSON.parse(stored);
  } else {
    // Populate with 1 mock lead to make dashboard immediately look elegant and active
    leadsList = [
      {
        name: "Devon Miller",
        email: "devon@stripe.com",
        budget: "$4,500 - $6,000",
        scope: "Build a highly scalable customer review widget dashboard using React & Node.",
        channel: "Web Widget",
        timestamp: new Date(Date.now() - 3600000 * 4).toLocaleString() // 4 hours ago
      }
    ];
    localStorage.setItem('agentic_freelance_leads', JSON.stringify(leadsList));
  }

  // Fetch real-world leads captured on server disk by Telegram Bot
  try {
    const response = await fetch('/leads.json');
    if (response.ok) {
      const serverLeads = await response.json();
      if (Array.isArray(serverLeads)) {
        serverLeads.forEach(sLead => {
          const isDuplicate = leadsList.some(lLead => 
            lLead.email === sLead.email && 
            lLead.timestamp === sLead.timestamp
          );
          if (!isDuplicate) {
            leadsList.push(sLead);
          }
        });
        
        // Sort leads: newest first
        leadsList.sort((a, b) => {
          const timeA = Date.parse(a.timestamp) || 0;
          const timeB = Date.parse(b.timestamp) || 0;
          return timeB - timeA;
        });

        renderLeads();
      }
    }
  } catch (err) {
    console.warn("Could not fetch server leads.json: ", err);
  }
}

function saveLead(leadData) {
  leadsList.unshift(leadData); // Add new lead to the beginning
  localStorage.setItem('agentic_freelance_leads', JSON.stringify(leadsList));
  
  // Render updates
  renderLeads();
  
  // Appends special success bubble in chat playground
  setTimeout(() => {
    appendChatBubble(`System: 🎉 Lead profile for **${leadData.name || 'Anonymous'}** successfully synchronized to your leads database!`, 'system');
  }, 1000);
}

function renderLeads() {
  const tableBody = document.getElementById('leads-table-body');
  const countStat = document.getElementById('stat-leads-count');
  
  if (countStat) countStat.textContent = leadsList.length;

  if (!tableBody) return;

  if (leadsList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-leads-state">
            <i class="fa-regular fa-folder-open"></i>
            <h4>No leads captured yet</h4>
            <p>Your leads will automatically populate here as users converse with your bot preview.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = '';
  
  leadsList.forEach(lead => {
    const tr = document.createElement('tr');
    
    // Formatting properties
    const clientName = lead.name || '<span style="color: var(--text-muted);">Not Provided</span>';
    const clientEmail = lead.email || '<span style="color: var(--text-muted);">Not Provided</span>';
    const clientBudget = lead.budget || '<span style="color: var(--text-muted);">Not Provided</span>';
    const clientScope = lead.scope || '<span style="color: var(--text-muted);">Not Provided</span>';
    const channelLabel = lead.channel || 'Web Widget';
    
    const badgeClass = channelLabel === 'Web Widget' ? 'badge-lead' : 'badge-integration';

    tr.innerHTML = `
      <td style="font-weight: 600;">${clientName}</td>
      <td>${clientEmail}</td>
      <td style="color: var(--accent-green); font-weight: 600;">${clientBudget}</td>
      <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${clientScope}">${clientScope}</td>
      <td><span class="badge ${badgeClass}">${channelLabel}</span></td>
      <td style="font-size: 11px; color: var(--text-muted);">${lead.timestamp}</td>
    `;
    
    tableBody.appendChild(tr);
  });
}

// Export Leads as JSON File Download
window.exportLeads = function() {
  if (leadsList.length === 0) {
    alert('No leads available to export.');
    return;
  }
  
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(leadsList, null, 2)
  )}`;
  
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `agentic_freelance_leads_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// API Mock Connector Alerts & Visual Upgrades
window.connectWhatsApp = function() {
  const token = prompt("Enter your WhatsApp Cloud API System User Access Token:", "EAAGb2s...");
  if (token === null) return; // cancelled
  if (token.trim() === '') {
    alert("WhatsApp Access Token is required to complete API handshake.");
    return;
  }

  // Update card status
  const status = document.getElementById('integration-status-whatsapp');
  const text = document.getElementById('integration-text-whatsapp');
  const btn = document.getElementById('btn-whatsapp-connect');

  status.className = 'integration-status connected';
  text.textContent = 'Connected';
  btn.textContent = 'Configure';
  btn.style.background = 'var(--bg-tertiary)';
  btn.style.color = 'var(--text-secondary)';

  appendChatBubble("System: 🔌 Connected WhatsApp Cloud API connector. Outgoing client messages will forward to WhatsApp webhook listeners.", "system");
};

window.connectTelegram = function() {
  const token = prompt("Enter your Telegram Bot Token obtained from BotFather:", "628371946:AAH...");
  if (token === null) return; // cancelled
  if (token.trim() === '') {
    alert("Telegram Token is required to initialize connection.");
    return;
  }

  // Update card status
  const status = document.getElementById('integration-status-telegram');
  const text = document.getElementById('integration-text-telegram');
  const btn = document.getElementById('btn-telegram-connect');

  status.className = 'integration-status connected';
  text.textContent = 'Connected';
  btn.textContent = 'Configure';
  btn.style.background = 'var(--bg-tertiary)';
  btn.style.color = 'var(--text-secondary)';

  appendChatBubble("System: 🔌 Handshake verified with @BotFather. Telegram message polling services active.", "system");
};

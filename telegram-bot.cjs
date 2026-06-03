/**
 * telegram-bot.js
 * A zero-dependency, production-ready Node.js bridge for your Telegram Bot.
 * Links your real Telegram Bot token directly to your custom freelance RAG context and lead-capture engine!
 */

const fs = require('fs');
const https = require('https');
const readline = require('readline');

// File paths
const CONFIG_FILE = 'config.json';
const LEADS_FILE = 'leads.json';

// Default Fallback Configuration
const DEFAULT_CONFIG = {
  token: "", // Will be filled by user
  name: "FreelanceHelper",
  vibe: "friendly",
  leadFields: { name: true, email: true, budget: true, scope: true },
  context: `SERVICES: Premium UI/UX design, custom Figma wireframes, high-converting portfolios, Webflow development, and SaaS interfaces.
PRICING: Figma design sets start at $1,500. Full-service Webflow custom pages start at $2,500. Hourly rate is $75/hr.
PORTFOLIO: Designed 20+ successful SaaS interfaces and completed landing pages for top remote startups with 5-star feedback.
TIMELINE: Ballpark landing page completed in 2 weeks. Comprehensive dashboard designs take 4 weeks.`
};

// Personality dialogue maps
const PERSONAS = {
  professional: {
    unknown: "I do not have specific details regarding that query in my current context. However, I can log your requirements and have our team follow up with you.",
    templates: {
      pricing: "Our structured pricing parameters: {content}.",
      services: "Our current active capabilities include: {content}.",
      portfolio: "Our past completed implementations: {content}.",
      timeline: "Regarding project completion schedules: {content}."
    },
    leadPrompt: {
      name: "To compile a customized proposal, could you please provide your **full name**?",
      email: "Thank you. What is the best **business email** address to reach you?",
      budget: "Understood. Could you specify your estimated **budget range** for this project?",
      scope: "Noted. Lastly, could you provide a brief description of the **project scope** and key objectives?"
    },
    leadConfirm: "Thank you. I have logged those details securely. Our team will review your project parameters and respond within one business day."
  },
  friendly: {
    unknown: "Oh, that's a super good question! I don't have the exact answer in my logs right now, but if you leave your details, we can get back to you with the scoop! Let me know if you want to connect! 🌟",
    templates: {
      pricing: "Sure thing! Here's the details on pricing: {content} 💰 Let me know if that fits!",
      services: "We love helping clients with these awesome services: {content} 🚀",
      portfolio: "We're super proud of our past work! Check this out: {content} 🎉",
      timeline: "We work fast but ensure super high quality! Here's our timeline info: {content} 📅"
    },
    leadPrompt: {
      name: "Ooh, I'd love to help you get started on this exciting journey! 🚀 To kick things off, what is your **name**? 😊",
      email: "Awesome name! 😄 What's your **email address** so I can send details your way?",
      budget: "Perfect! 💸 What's your approximate **budget** for this project? (Any ballpark range is great!)",
      scope: "Almost done! 🎉 Could you tell me a little bit about what you want us to build? What's your **project vision**?"
    },
    leadConfirm: "Yay! Thank you so much! 🎉 I've successfully saved all your information. We are going to look over your project details right away and reach out really soon!"
  },
  hustler: {
    unknown: "Great question, but let's not get bogged down in micro-details. Let's get you set up with a quick discovery call where we can outline everything custom. Let me capture your project coordinates first!",
    templates: {
      pricing: "Here is the bottom-line pricing structure: {content}. We offer high-ROI solutions that pay for themselves.",
      services: "Here's exactly how we help you scale: {content}.",
      portfolio: "We deliver elite results. Here is some of our track record: {content}.",
      timeline: "We launch fast. Here's our delivery velocity: {content}."
    },
    leadPrompt: {
      name: "Let's stop talking and start executing! 🚀 Drop your **name** here so we can register your request.",
      email: "Solid. What **email** do you use for business? We need this to register the project.",
      budget: "Got it. Let's talk numbers: What's your **budget** range? (We work with all serious levels, let's close it!)",
      scope: "Almost there. Give me a 1-sentence quick summary of the **project requirements**. What are we conquering?"
    },
    leadConfirm: "Perfect! Details locked in. ⚡ I'm passing this straight to our lead strategist. We will ping you back immediately to finalize terms. Let's make this big!"
  },
  technical: {
    unknown: "Query warning: Context parameters for that query are currently undefined. Recommendation: Register your client data node so an engineer can provide a full technical answer.",
    templates: {
      pricing: "Cost analysis matrix parsed: {content}. Custom pricing depends on active resource allocations.",
      services: "Service stack modules available: {content}.",
      portfolio: "Reference implementation nodes: {content}.",
      timeline: "Deployment latency / Timeline data: {content}."
    },
    leadPrompt: {
      name: "Initiating lead capture script to parse project variables. 🛠️ Step 1: Please input your identifier name (**Name**):",
      email: "Input registered. Next required parameter: **Email Address**.",
      budget: "Value parsed. Input variable target: **Project Budget** (expected format: numeric / range).",
      scope: "Standard schema parsing. Please provide a brief narrative of the **Project Scope** and deliverables."
    },
    leadConfirm: "Data transmission successful. Lead payload compiled and appended to local storage nodes. Webhook callback complete. System returning to standby. 🔌"
  }
};

// Conversational Session State per Chat ID
const sessions = {};

// Load / Create local configurations
let config = { ...DEFAULT_CONFIG };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    console.log(`Loaded existing configuration from ${CONFIG_FILE}`);
  } catch (err) {
    console.error(`Error reading config.json, using defaults: ${err.message}`);
  }
} else {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`Created new default configuration at ${CONFIG_FILE}`);
}

// Request Token if empty
if (!config.token || config.token.trim() === "") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n🔑 Enter your Telegram Bot Token from BotFather: ', (enteredToken) => {
    if (enteredToken && enteredToken.trim() !== "") {
      config.token = enteredToken.trim();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log(`Saved token securely to ${CONFIG_FILE}!`);
      rl.close();
      startPolling();
    } else {
      console.log('Error: A Telegram Token is required to start the bot. Exiting.');
      process.exit(1);
    }
  });
} else {
  startPolling();
}

// Helper to make HTTPS requests to Telegram API
function callTelegram(method, params, callback) {
  const postData = JSON.stringify(params);
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${config.token}/${method}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (callback) callback(json);
      } catch (err) {
        console.error(`Error parsing response: ${err.message}`);
        if (callback) callback({ ok: false, error: err.message });
      }
    });
  });

  req.on('error', (err) => {
    console.error(`Telegram API request error: ${err.message}`);
    if (callback) callback({ ok: false, error: err.message });
  });

  req.write(postData);
  req.end();
}

// Long-polling Loop
let offset = 0;
function startPolling() {
  console.log(`\n🤖 Bot ${config.name} (${config.vibe.toUpperCase()} vibe) is now online!`);
  console.log(`💬 Open your Telegram app, search for your bot, and send a message. Type 'Ctrl+C' to stop.\n`);

  // Verify token works
  callTelegram('getMe', {}, (res) => {
    if (res.ok) {
      console.log(`✅ Verified bot identity: @${res.result.username}`);
      poll();
    } else {
      console.error(`❌ Connection failed! Verify your Telegram token is correct in config.json.`);
      console.error(`Error detail: ${res.description || 'Unknown error'}`);
      process.exit(1);
    }
  });
}

function poll() {
  callTelegram('getUpdates', { offset: offset, timeout: 30 }, (res) => {
    if (res.ok && res.result && res.result.length > 0) {
      res.result.forEach((update) => {
        offset = update.update_id + 1;
        if (update.message) {
          handleIncomingMessage(update.message);
        }
      });
    }
    // Restart polling immediately
    setTimeout(poll, 100);
  });
}

// RAG Conversational matching & stateful lead captures
function handleIncomingMessage(msg) {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name || "Client";
  const userMsg = msg.text ? msg.text.trim() : "";

  if (!userMsg) return;

  console.log(`[Message from @${username}]: ${userMsg}`);

  // Create session if not exists
  if (!sessions[chatId]) {
    sessions[chatId] = {
      isCapturing: false,
      currentStep: null,
      capturedData: {}
    };
  }

  const session = sessions[chatId];
  const persona = PERSONAS[config.vibe] || PERSONAS.friendly;
  let replyText = "";

  // 1. Check if currently in Lead Capture state
  if (session.isCapturing) {
    session.capturedData[session.currentStep] = userMsg;
    
    // Find next step
    const nextStep = getNextCaptureStep(session.currentStep);
    if (nextStep) {
      session.currentStep = nextStep;
      replyText = persona.leadPrompt[nextStep];
    } else {
      // Completed lead capture!
      replyText = persona.leadConfirm;
      
      // Save lead payload locally
      const leadData = {
        name: session.capturedData.name || null,
        email: session.capturedData.email || null,
        budget: session.capturedData.budget || null,
        scope: session.capturedData.scope || null,
        channel: `Telegram (@${msg.from.username || ''})`,
        timestamp: new Date().toLocaleString()
      };
      
      saveLeadToDisk(leadData);
      
      // Reset session
      session.isCapturing = false;
      session.currentStep = null;
      session.capturedData = {};
    }
  } 
  // 2. Look for Hiring Intent triggers
  else {
    const textLower = userMsg.toLowerCase();
    const hireKeywords = [
      "hire", "work", "quote", "interested", "consultation", 
      "setup", "order", "price", "project", "custom", 
      "book", "contact", "call", "proposal", "contract"
    ];
    const triggerLead = hireKeywords.some(keyword => textLower.includes(keyword));

    if (triggerLead) {
      session.isCapturing = true;
      session.capturedData = {};
      
      // Find first enabled field
      const nextStep = getNextCaptureStep(null);
      if (nextStep) {
        session.currentStep = nextStep;
        replyText = persona.leadPrompt[nextStep];
      } else {
        replyText = persona.leadConfirm;
        session.isCapturing = false;
      }
    } 
    // 3. Keywords Matching - Basic RAG context retrieval
    else {
      const categories = {
        pricing: ["price", "pricing", "cost", "how much", "rate", "fee", "payment", "charge", "rates", "fees", "expensive"],
        services: ["service", "services", "offer", "do you do", "skills", "capabilities", "can you", "what do you", "stack", "tech"],
        portfolio: ["portfolio", "work", "examples", "past", "experience", "case study", "track record", "proven", "built"],
        timeline: ["timeline", "duration", "how long", "speed", "velocity", "delivery", "days", "weeks", "months", "schedule"]
      };

      let matchedCategory = null;
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => textLower.includes(keyword))) {
          matchedCategory = category;
          break;
        }
      }

      if (matchedCategory) {
        const contextLines = config.context.split('\n');
        let matchedContent = "";

        for (const line of contextLines) {
          if (line.toLowerCase().includes(matchedCategory)) {
            matchedContent = line.replace(new RegExp(`^${matchedCategory}:?`, 'i'), '').trim();
            break;
          }
        }

        if (!matchedContent) {
          const matchingLines = contextLines.filter(line => 
            categories[matchedCategory].some(kw => line.toLowerCase().includes(kw))
          );
          if (matchingLines.length > 0) {
            matchedContent = matchingLines.join(" ");
          }
        }

        if (matchedContent) {
          const responseTemplate = persona.templates[matchedCategory];
          replyText = responseTemplate.replace("{content}", matchedContent);
        }
      }

      // Handle greetings or fallback
      if (!replyText) {
        if (textLower.includes("hello") || textLower.includes("hi") || textLower.includes("hey") || textLower.includes("start")) {
          replyText = `Hello! 😊 I'm ${config.name}, your virtual assistant. How can I help you today? Type 'portfolio' or 'pricing' to learn more, or just let me know if you want to hire us!`;
        } else {
          replyText = persona.unknown;
        }
      }
    }
  }

  // Send message back to Telegram
  callTelegram('sendMessage', {
    chat_id: chatId,
    text: replyText,
    parse_mode: 'Markdown'
  });
}

function getNextCaptureStep(currentStep = null) {
  const fieldsOrder = ['name', 'email', 'budget', 'scope'];
  let startIndex = currentStep ? fieldsOrder.indexOf(currentStep) + 1 : 0;
  
  for (let i = startIndex; i < fieldsOrder.length; i++) {
    const field = fieldsOrder[i];
    if (config.leadFields[field]) {
      return field;
    }
  }
  return null;
}

function saveLeadToDisk(leadData) {
  console.log(`\n🎉 [LEAD CAPTURED] Saving Client Info: ${leadData.name} (${leadData.email})`);
  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try {
      leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    } catch (err) {
      console.error("Error reading leads file, starting fresh.");
    }
  }
  leads.unshift(leadData);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
  console.log(`Saved to local leads file: ${LEADS_FILE}\n`);
}

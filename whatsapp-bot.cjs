/**
 * whatsapp-bot.cjs
 * A production-ready backend Node.js webhook server for the WhatsApp Business Cloud API.
 * Integrates directly with your custom RAG context and stateful lead intake system!
 * 
 * Uses standard Express.js (or zero-dependency https server) to listen for Meta Webhook events,
 * manages conversational state per WhatsApp sender phone number, and replies via WhatsApp Cloud API.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

// Config and Leads paths
const CONFIG_FILE = 'config.json';
const LEADS_FILE = 'leads.json';

// Load configurations
let config = {};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    console.error("Error reading config.json: " + err.message);
  }
}

// Meta WhatsApp Developer Credentials (from WhatsApp Cloud API console)
const WHATSAPP_TOKEN = config.token || ""; // Set your WhatsApp System User Access Token
const PHONE_NUMBER_ID = "1098273645";      // Replace with your real Meta Phone Number ID
const VERIFY_TOKEN = "agent_handshake_solopreneurbot"; // Custom handshake token for Meta Webhook setup

// Vibe Conversational Session State per Sender WhatsApp Number
const sessions = {};

// Dialogue Maps (shared with the core engine)
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

// ---------------------------------------------------------
// Core RAG & Lead Capture Session Processor
// ---------------------------------------------------------
function processWhatsAppMessage(phoneNum, textMsg, senderName) {
  const textLower = textMsg.toLowerCase().trim();
  
  if (!sessions[phoneNum]) {
    sessions[phoneNum] = {
      isCapturing: false,
      currentStep: null,
      capturedData: {}
    };
  }

  const session = sessions[phoneNum];
  const persona = PERSONAS[config.vibe] || PERSONAS.friendly;
  let replyText = "";

  // 1. Check if currently in Lead Capture state
  if (session.isCapturing) {
    session.capturedData[session.currentStep] = textMsg;
    
    const nextStep = getNextCaptureStep(session.currentStep);
    if (nextStep) {
      session.currentStep = nextStep;
      replyText = persona.leadPrompt[nextStep];
    } else {
      // Complete Lead Capture!
      replyText = persona.leadConfirm;
      
      const leadData = {
        name: session.capturedData.name || null,
        email: session.capturedData.email || null,
        budget: session.capturedData.budget || null,
        scope: session.capturedData.scope || null,
        channel: `WhatsApp (+${phoneNum})`,
        timestamp: new Date().toLocaleString()
      };
      
      saveLeadToDisk(leadData);
      
      // Reset
      session.isCapturing = false;
      session.currentStep = null;
      session.capturedData = {};
    }
  } 
  // 2. Detect Hiring Intent
  else {
    const hireKeywords = [
      "hire", "work", "quote", "interested", "consultation", 
      "setup", "order", "price", "project", "custom", 
      "book", "contact", "call", "proposal", "contract"
    ];
    const triggerLead = hireKeywords.some(keyword => textLower.includes(keyword));

    if (triggerLead) {
      session.isCapturing = true;
      session.capturedData = {};
      
      const nextStep = getNextCaptureStep(null);
      if (nextStep) {
        session.currentStep = nextStep;
        replyText = persona.leadPrompt[nextStep];
      } else {
        replyText = persona.leadConfirm;
        session.isCapturing = false;
      }
    } 
    // 3. Keywords Matching - Basic RAG Context
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

        if (matchedContent) {
          const responseTemplate = persona.templates[matchedCategory];
          replyText = responseTemplate.replace("{content}", matchedContent);
        }
      }

      // Greetings fallback
      if (!replyText) {
        if (textLower.includes("hello") || textLower.includes("hi") || textLower.includes("hey") || textLower.includes("start")) {
          replyText = `Hello! 😊 I'm ${config.name}, your virtual assistant. How can I help you today? Type 'portfolio' or 'pricing' to learn more, or just let me know if you want to hire us!`;
        } else {
          replyText = persona.unknown;
        }
      }
    }
  }

  return replyText;
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
  console.log(`🎉 [LEAD CAPTURED VIA WHATSAPP] Saving Client: ${leadData.name}`);
  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try {
      leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    } catch (err) {}
  }
  leads.unshift(leadData);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

// Send outbound message back via WhatsApp Cloud API
function sendWhatsAppMessage(recipientPhone, textContent) {
  const postData = JSON.stringify({
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "text",
    text: { body: textContent }
  });

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/v17.0/${PHONE_NUMBER_ID}/messages`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => {
      console.log(`WhatsApp API response parsed: ${body}`);
    });
  });

  req.on('error', (e) => {
    console.error(`Error sending message to Meta API: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// ---------------------------------------------------------
// Express-like HTTP Webhook Web Server
// ---------------------------------------------------------
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const urlParsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlParsed.pathname;

  // Meta Webhook Verification Handshake (GET /webhook)
  if (req.method === 'GET' && pathname === '/webhook') {
    const mode = urlParsed.searchParams.get('hub.mode');
    const token = urlParsed.searchParams.get('hub.verify_token');
    const challenge = urlParsed.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log("✅ Meta webhook verified successfully!");
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
    } else {
      console.warn("❌ Webhook verify challenge token failed.");
      res.writeHead(403);
      res.end();
    }
  }

  // Incoming Meta Webhook Payloads (POST /webhook)
  else if (req.method === 'POST' && pathname === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        // Parse WhatsApp Message payload from Meta structure
        if (payload.entry && payload.entry[0].changes && payload.entry[0].changes[0].value.messages) {
          const messageObj = payload.entry[0].changes[0].value.messages[0];
          const contactObj = payload.entry[0].changes[0].value.contacts[0];
          
          const phoneNum = messageObj.from; // Sender's phone number
          const senderName = contactObj.profile.name || "WhatsApp Client";
          
          if (messageObj.type === 'text') {
            const userMsg = messageObj.text.body;
            console.log(`\n[WhatsApp from +${phoneNum} (${senderName})]: ${userMsg}`);
            
            // Process query through custom agent RAG engine
            const reply = processWhatsAppMessage(phoneNum, userMsg, senderName);
            
            // Send back to Meta API
            console.log(`[Outbound WhatsApp reply]: ${reply}`);
            sendWhatsAppMessage(phoneNum, reply);
          }
        }
      } catch (err) {
        console.error("Error parsing webhook POST payload: " + err.message);
      }
      
      res.writeHead(200);
      res.end();
    });
  } 
  
  // Root diagnostic route
  else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "running", service: "WhatsApp Webhook Bot API Bridge" }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🟢 WhatsApp Webhook Bot Server is listening on port ${PORT}`);
  console.log(`🔗 Local webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`👉 Use npx ngrok http ${PORT} to expose public HTTPS endpoint for Meta Console integration!\n`);
});

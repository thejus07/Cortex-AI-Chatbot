/**
 * simulator.js
 * High-performance client-side AI Chatbot Simulator and Lead-Capture State Engine.
 */

// Default templates for knowledge bases
const KNOWLEDGE_TEMPLATES = {
  developer: `SERVICES: Full-stack web application development, custom API integrations, Next.js/React frontends, Node.js backends, database configuration (PostgreSQL, MongoDB), and cloud deployment (AWS, Vercel, Supabase).
PRICING: General rate is $75/hour. A custom landing page starts at $1,500. Complex SaaS platforms or multi-page portals start at $5,000.
PORTFOLIO: Completed over 50 projects including an e-commerce platform with $100k/mo sales and a custom CRM system used by 200+ agents.
TIMELINE: Small projects take 1-2 weeks. Standard SaaS or full platforms take 4-8 weeks.`,

  designer: `SERVICES: Premium UI/UX design, Figma wireframing, web/mobile mockup design, interactive design systems, brand identity guidelines, and high-fidelity Webflow implementations.
PRICING: Brand identity starts at $1,200. Custom Figma UI/UX design for web/mobile applications starts at $3,000. Interactive Webflow development starts at $2,000.
PORTFOLIO: Designed award-winning fintech dashboards, crafted brand visual identities for 15+ startups, and built custom high-converting portfolios.
TIMELINE: Initial mockups delivered in 5-7 business days. A complete website design and development package takes 3-4 weeks.`,

  copywriter: `SERVICES: Direct-response conversion copywriting, SaaS landing pages, high-converting email welcome flows, product descriptions, SEO authority blog articles, and cold outreach sequences.
PRICING: Landing page sales copy starts at $800. Complete email marketing sequences (5-7 emails) start at $500. High-quality SEO articles are $150 each.
PORTFOLIO: Written landing pages boasting a 28% average increase in sign-ups, created email sequences resulting in $50k in pipeline revenue, and published in major tech sites.
TIMELINE: Standard copywriting tasks delivered in 4-6 business days. Large-scale content assets completed in 2 weeks.`,

  seo: `SERVICES: Comprehensive technical SEO audits, keyword gap analysis, structural site optimization, on-page content editing, high-authority backlink building, and local SEO optimizations.
PRICING: In-depth Technical SEO Audits start at $600. Dynamic monthly retainers for active organic growth start at $1,200/month (3-month minimum commitment).
PORTFOLIO: Assisted B2B SaaS startup in scaling from 0 to 180k monthly organic visits, secured Top-3 rankings for 40+ high-intent search terms.
TIMELINE: Detailed site audit delivered within 7 business days. Traffic results typically compound and display within 60-90 days.`
};

// Personality conversational styling mappings
const PERSONA_VIBES = {
  professional: {
    prefix: "Respectful, highly structured, business-oriented.",
    greetings: [
      "Welcome. I am your specialized virtual assistant. How can I assist you with our professional services today?",
      "Greetings. I am here to help you evaluate our capabilities and project offerings. What information can I provide?"
    ],
    unknown: "I do not have precise details regarding that query in my current system. However, I would be pleased to record your requirements and have our principal consultant contact you directly.",
    templates: {
      pricing: "Our structured pricing is as follows: {content}. We ensure all deliverables adhere strictly to agreed scopes.",
      services: "We specialize in the following core capabilities: {content}.",
      portfolio: "Our verified track record includes: {content}.",
      timeline: "Regarding project delivery schedules: {content}."
    },
    leadPrompt: "Understood. To provide an accurate proposal and coordinate a direct consultation, could you please share your **full name**?",
    leadConfirm: "Thank you. I have logged those details securely. Our team will review your project parameters and respond within one business day. Is there anything else I can clarify?"
  },
  
  friendly: {
    prefix: "Warm, energetic, highly supportive, uses emojis.",
    greetings: [
      "Hi there! 😊 I'm so excited to chat with you today! How can I help you bring your amazing ideas to life? ✨",
      "Hello! Welcome! 👋 I'm here to answer any questions you have about our services, pricing, or portfolio. What's on your mind?"
    ],
    unknown: "Oh, that's a super good question! I don't have the exact answer in my notebook right now, but if you leave your details, we can get back to you with the scoop! Let me know if you want to connect! 🌟",
    templates: {
      pricing: "Sure thing! Here's the details on pricing: {content} 💰 Let me know if that fits your budget!",
      services: "We love helping clients with these awesome services: {content} 🚀",
      portfolio: "We're super proud of our past work! Check this out: {content} 🎉",
      timeline: "We work fast but ensure super high quality! Here's our timeline info: {content} 📅"
    },
    leadPrompt: "Ooh, I'd love to help you get started on this exciting journey! 🚀 To kick things off, could you please tell me your **name**?",
    leadConfirm: "Yay! Thank you so much! 🎉 I've successfully saved all your information. We are going to look over your project details right away and reach out really soon. Hope you have a wonderful day! 🌸"
  },
  
  hustler: {
    prefix: "Results-driven, fast-paced, charismatic closing-focused.",
    greetings: [
      "Hey! Let's get straight to business. I'm your digital closing agent. What major project are we launching today? 🚀",
      "Welcome. Time is money, let's build something epic. What details do you need to get this project moving?"
    ],
    unknown: "Great question, but let's not get bogged down in micro-details. Let's get you set up with a quick call where we can outline everything custom. Let me capture your project coordinates first!",
    templates: {
      pricing: "Here is the bottom-line pricing structure: {content}. We offer high-ROI solutions that pay for themselves.",
      services: "Here's exactly how we help you scale: {content}.",
      portfolio: "We deliver elite results. Here is some of our track record: {content}.",
      timeline: "We launch fast. Here's our delivery velocity: {content}."
    },
    leadPrompt: "Let's stop talking and start executing! 🚀 Drop your **name** here so we can register your request and schedule a discovery call.",
    leadConfirm: "Perfect! Details locked in. ⚡ I'm passing this straight to our lead strategist. We will ping you back immediately to finalize terms. Let's make this big!"
  },
  
  technical: {
    prefix: "Geeky, detail-oriented, architectural, formal.",
    greetings: [
      "System initialized. 🤖 Custom AI Sandbox ready. Please specify your query parameters or architectural requirements.",
      "Connection established. Processing system metadata. I can provide complete specs regarding services, API hooks, and deployment logs."
    ],
    unknown: "Query warning: Context parameters for that query are currently undefined. Recommendation: Register your client data node so an engineer can provide a full technical answer.",
    templates: {
      pricing: "Cost analysis matrix parsed: {content}. Custom pricing depends on active resource allocations.",
      services: "Service stack modules available: {content}.",
      portfolio: "Reference implementation nodes: {content}.",
      timeline: "Deployment latency / Timeline data: {content}."
    },
    leadPrompt: "Initiating lead capture script to parse project variables. 🛠️ Step 1: Please input your identifier name (**Name**):",
    leadConfirm: "Data transmission successful. Lead payload compiled and appended to local storage nodes. Deployment callback complete. System returning to standby. 🔌"
  }
};

class ChatbotSimulator {
  constructor(config = {}) {
    this.name = config.name || "SolopreneurBot";
    this.vibe = config.vibe || "professional";
    this.context = config.context || KNOWLEDGE_TEMPLATES.developer;
    this.leadFields = config.leadFields || { name: true, email: true, budget: true, scope: true };
    this.onLeadCaptured = config.onLeadCaptured || null;
    
    // Lead capture tracking state
    this.isCapturingLead = false;
    this.currentCaptureStep = null; // 'name', 'email', 'budget', 'scope'
    this.capturedData = {};
  }
  
  updateConfig(name, vibe, context, leadFields) {
    this.name = name;
    this.vibe = vibe;
    this.context = context;
    this.leadFields = leadFields;
  }
  
  resetSession() {
    this.isCapturingLead = false;
    this.currentCaptureStep = null;
    this.capturedData = {};
  }
  
  getGreeting() {
    const list = PERSONA_VIBES[this.vibe].greetings;
    const index = Math.floor(Math.random() * list.length);
    return list[index].replace("{name}", this.name);
  }
  
  processMessage(userMessage) {
    const text = userMessage.toLowerCase().trim();
    const persona = PERSONA_VIBES[this.vibe];
    
    // 1. If currently in lead capture flow, process input for fields
    if (this.isCapturingLead) {
      return this.continueLeadCapture(text, userMessage);
    }
    
    // 2. Detect lead generation / hiring intent
    const hireKeywords = [
      "hire", "work", "quote", "interested", "consultation", 
      "setup", "order", "price", "project", "custom", 
      "book", "contact", "call", "proposal", "contract"
    ];
    const triggerLead = hireKeywords.some(keyword => text.includes(keyword));
    
    if (triggerLead) {
      this.isCapturingLead = true;
      return this.startLeadCapture();
    }
    
    // 3. Keywords Matching - Basic RAG context retrieval
    const categories = {
      pricing: ["price", "pricing", "cost", "how much", "rate", "fee", "payment", "charge", "rates", "fees", "expensive"],
      services: ["service", "services", "offer", "do you do", "skills", "capabilities", "can you", "what do you", "stack", "tech"],
      portfolio: ["portfolio", "work", "examples", "past", "experience", "case study", "track record", "proven", "built"],
      timeline: ["timeline", "duration", "how long", "speed", "velocity", "delivery", "days", "weeks", "months", "schedule"]
    };
    
    let matchedCategory = null;
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        matchedCategory = category;
        break;
      }
    }
    
    if (matchedCategory) {
      // Search knowledge base text for relevant lines
      const contextLines = this.context.split('\n');
      let matchedContent = "";
      
      // Match line starting with category or containing it
      for (const line of contextLines) {
        if (line.toLowerCase().includes(matchedCategory)) {
          matchedContent = line.replace(new RegExp(`^${matchedCategory}:?`, 'i'), '').trim();
          break;
        }
      }
      
      // Fallback to finding lines that contain some related keywords
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
        return responseTemplate.replace("{content}", matchedContent);
      }
    }
    
    // 4. Default persona responses for general inputs
    if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
      return this.getGreeting();
    }
    
    return persona.unknown;
  }
  
  startLeadCapture() {
    const persona = PERSONA_VIBES[this.vibe];
    this.capturedData = {
      timestamp: new Date().toLocaleString(),
      channel: this.getMockChannelName()
    };
    
    // Find first enabled field
    const nextStep = this.getNextCaptureStep();
    if (nextStep) {
      this.currentCaptureStep = nextStep;
      return this.getPromptForStep(nextStep);
    } else {
      // If no fields are captured, complete instantly
      return this.completeLeadCapture();
    }
  }
  
  continueLeadCapture(input, rawInput) {
    const step = this.currentCaptureStep;
    
    // Store input
    this.capturedData[step] = rawInput;
    
    // Determine next step
    const nextStep = this.getNextCaptureStep(step);
    if (nextStep) {
      this.currentCaptureStep = nextStep;
      return this.getPromptForStep(nextStep);
    } else {
      // Completed!
      return this.completeLeadCapture();
    }
  }
  
  getNextCaptureStep(currentStep = null) {
    const fieldsOrder = ['name', 'email', 'budget', 'scope'];
    let startIndex = currentStep ? fieldsOrder.indexOf(currentStep) + 1 : 0;
    
    for (let i = startIndex; i < fieldsOrder.length; i++) {
      const field = fieldsOrder[i];
      if (this.leadFields[field]) {
        return field;
      }
    }
    return null;
  }
  
  getPromptForStep(step) {
    const prompts = {
      name: {
        professional: "Understood. To compile a tailored proposal, could you please provide your **full name**?",
        friendly: "Awesome! Let's get to know each other first! What is your **name**? 😊",
        hustler: "Let's win together! 🚀 What's your **name** so we can set up your client profile?",
        technical: "Initializing user verification. Please input your parameter value for: **Name**."
      },
      email: {
        professional: "Thank you. What is the best **business email** address to reach you for detailed specifications?",
        friendly: "Great name! 😄 What's your **email address** so I can send some goodies your way?",
        hustler: "Solid. What **email** do you use for business? We need this to register the project.",
        technical: "Input registered. Next required parameter: **Email Address**."
      },
      budget: {
        professional: "Excellent. Could you please specify your estimated **budget range** for this engagement (e.g. $2,000, $5,000+)?",
        friendly: "Perfect! 💸 What's your approximate **budget** for this super cool project? (Any ballpark range is great!)",
        hustler: "Got it. Let's talk numbers: What's your **budget** range? (We work with all serious levels, let's close it!)",
        technical: "Value parsed. Input variable target: **Project Budget** (expected format: numeric / range)."
      },
      scope: {
        professional: "Noted. Lastly, could you provide a brief description of the **project scope** and key objectives you'd like to achieve?",
        friendly: "Almost done! 🎉 Could you tell me a little bit about what you want us to build? What's your **project vision**?",
        hustler: "Almost there. Give me a 1-sentence quick summary of the **project requirements**. What are we conquering?",
        technical: "Standard schema parsing. Please provide a brief narrative of the **Project Scope** and deliverables."
      }
    };
    
    return prompts[step][this.vibe];
  }
  
  completeLeadCapture() {
    this.isCapturingLead = false;
    this.currentCaptureStep = null;
    
    // Save to leads database (callback hook)
    if (this.onLeadCaptured) {
      this.onLeadCaptured(this.capturedData);
    }
    
    return PERSONA_VIBES[this.vibe].leadConfirm;
  }
  
  getMockChannelName() {
    // Return channel name based on builder choice
    const activeChannelCard = document.querySelector('.channel-card.active');
    if (activeChannelCard) {
      return activeChannelCard.querySelector('span').textContent;
    }
    return "Web Widget";
  }
}

// Export global instance
window.KNOWLEDGE_TEMPLATES = KNOWLEDGE_TEMPLATES;
window.ChatbotSimulator = ChatbotSimulator;

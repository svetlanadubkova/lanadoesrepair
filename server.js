const fs = require('fs');
const path = require('path');

// Manually read .env file to override system environment
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    envLines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value;
        }
    });
}

// Load Art of Repair content
let artOfRepairContent = '';
const artOfRepairPath = path.join(__dirname, 'artofrepair.txt');
if (fs.existsSync(artOfRepairPath)) {
    artOfRepairContent = fs.readFileSync(artOfRepairPath, 'utf8');
}

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// API endpoint to proxy Claude requests
app.post('/api/claude', async (req, res) => {
    try {
        const { prompt, type, context } = req.body;
        const apiKey = process.env.CLAUDE_API_KEY;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }
        
        if (!apiKey) {
            return res.status(500).json({ error: 'CLAUDE_API_KEY not configured in .env file' });
        }

        // Build enhanced prompt with Art of Repair content
        let enhancedPrompt = '';
        
        if (type === 'nvc') {
            enhancedPrompt = `You are an expert in Nonviolent Communication (NVC) and the REPAIR process by Dr. Hazel-Grace Yates. 

Context about this person's situation:
${context}

Raw thoughts and feelings: "${prompt}"

Convert these raw thoughts into 3-4 clean "I feel..." and "I need..." statements following NVC principles. Return ONLY the statements, one per line, with no introduction or explanation. Make them:
- Personal and blame-free
- Focused on feelings and needs
- Authentic to their experience
- Helpful for healthy communication`;

        } else if (type === 'restoration') {
            enhancedPrompt = `You are an expert in relationship repair using the REPAIR process by Dr. Hazel-Grace Yates. Here is the relevant Art of Repair framework:

${artOfRepairContent.substring(artOfRepairContent.indexOf('RESTORING INTEGRITY'), artOfRepairContent.indexOf('RESTORING INTEGRITY PRACTICES'))}

Context about this situation:
${context}

Generate a restoration menu with 5 specific, actionable options based on the 5 R's framework:
1. REMORSE - Express apology, regret, and/or accountability (from BOTH people as appropriate)
2. RESTORATIVE ACTIONS - Take actions to restore trust (include tangible options like: making a meal, giving a gift, offering a massage, paying for something meaningful, acts of service, physical gestures, cleaning up messes, etc.)
3. REVISE AGREEMENTS - Update agreements or create new ones (that BOTH people commit to)
4. REWRITE STORIES - Update negative stories about each other (work BOTH people can do)
5. REDO - Learn from the past and plan to show up better (how BOTH can improve)

CRITICAL: This process is BIDIRECTIONAL. Frame recommendations for BOTH PEOPLE to participate in repair, not just one person fixing things. Use language like "you both," "each person," "together you can," etc. Both people should have actions to take in restoring trust and connection.

IMPORTANT: For RESTORATIVE ACTIONS, always include concrete, tangible actions like gifts, acts of service, physical touch, meals, paying for things, or other material gestures that demonstrate care and effort to repair trust.

Start with a brief summary of the situation, then provide 5 specific recommendations (one for each R) that are practical and tailored to their unique situation and charge level.`;

        } else if (type === 'summary') {
            enhancedPrompt = `You are an expert in relationship repair using the REPAIR process by Dr. Hazel-Grace Yates.

Context about this situation:
${context}

Create a concise TLDR summary in bullet points for a PDF report. Include:

WHAT HAPPENED:
- 2-3 bullet points summarizing the key events/situation from both perspectives

IMPACT:
- 2-3 bullet points about the impact on the person who filled out the form
- 2-3 bullet points about the impact on their repair partner (if provided)

Keep it concise, neutral, and factual. Use bullet points only, no intro text.`;

        } else {
            enhancedPrompt = prompt;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: enhancedPrompt
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `Claude API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        res.json({ text: data.content[0].text });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Your repair website is now available!');
});
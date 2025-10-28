const Issue = require('../models/Issue');
const aiService = require('./aiService');

class IssueAIService {
  /**
   * Generate Jira ticket content from issue using AI
   */
  async generateJiraTicketContent(issueId) {
    // Fetch issue with all context
    const issue = await Issue.findById(issueId)
      .populate('reportedBy', 'fullName email')
      .populate('orgId', 'name')
      .populate('assignedTo', 'fullName email')
      .populate('votes.userId', 'fullName')
      .populate('comments.userId', 'fullName')
      .populate({
        path: 'images.imageId',
        select: 'publicUrl fileName'
      });

    if (!issue) {
      throw new Error('Issue not found');
    }

    // Build comprehensive context
    const context = this.buildContext(issue);

    // Build AI prompt
    const prompt = this.buildJiraPrompt(context);

    // Call AI service with Gemini
    const aiResponse = await aiService.generateWithGemini(prompt, {
      temperature: 0.7,
      maxTokens: 1500
    });

    // Parse response
    const ticketData = this.parseAIResponse(aiResponse);

    // Validate
    if (!ticketData.title || !ticketData.description) {
      throw new Error('AI generated invalid ticket data');
    }

    // Store AI-generated content
    issue.aiGeneratedTitle = ticketData.title;
    issue.aiGeneratedDescription = ticketData.description;
    issue.aiContext = ticketData;
    await issue.save();

    return ticketData;
  }

  /**
   * Build context from issue
   */
  buildContext(issue) {
    const voteStats = {
      confirm: 0,
      cannot_reproduce: 0,
      needs_info: 0,
      critical: 0
    };

    issue.votes.forEach(vote => {
      voteStats[vote.voteType] = (voteStats[vote.voteType] || 0) + 1;
    });

    return {
      organization: issue.orgId?.name || 'Unknown Org',
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      category: issue.category,
      environment: issue.environment || 'Unknown',
      browser: issue.browser || 'Not specified',
      deviceInfo: issue.deviceInfo || 'Not specified',
      reportedBy: issue.reportedBy?.fullName || 'Unknown',
      reportedByEmail: issue.reportedBy?.email || '',
      reportedAt: issue.createdAt,
      assignedTo: issue.assignedTo?.fullName || 'Unassigned',
      voteStats,
      totalVotes: issue.votes.length,
      votes: issue.votes.map(v => ({
        type: v.voteType,
        comment: v.comment,
        user: v.userId?.fullName || 'Unknown'
      })),
      comments: issue.comments.map(c => ({
        author: c.userId?.fullName || 'Unknown',
        text: c.text,
        date: c.createdAt
      })),
      imageCount: issue.images?.length || 0,
      impactedUsers: issue.impactedUsers || 'Unknown',
      severity: issue.severity,
      watchers: issue.watchers?.length || 0,
      tags: issue.tags || []
    };
  }

  /**
   * Build AI prompt for Jira ticket generation
   */
  buildJiraPrompt(context) {
    return `You are a technical issue tracker assistant. Generate a professional Jira ticket based on this bug report.

**Organization:** ${context.organization}

**Issue Title:** ${context.title}

**Description:** ${context.description}

**Priority:** ${context.priority}
**Category:** ${context.category}
**Environment:** ${context.environment}
**Browser:** ${context.browser}
**Device:** ${context.deviceInfo}
**Severity Score:** ${context.severity}/10

**Reported By:** ${context.reportedBy} (${context.reportedByEmail}) on ${context.reportedAt}
**Assigned To:** ${context.assignedTo}

**Team Votes (${context.totalVotes} total):**
- Confirmed: ${context.voteStats.confirm}
- Cannot Reproduce: ${context.voteStats.cannot_reproduce}
- Needs More Info: ${context.voteStats.needs_info}
- Critical: ${context.voteStats.critical}

**Vote Comments:**
${context.votes.filter(v => v.comment).map(v => `- ${v.user} (${v.type}): ${v.comment}`).join('\n') || 'None'}

**Team Discussion (${context.comments.length} comments):**
${context.comments.map(c => `- ${c.author} (${new Date(c.date).toLocaleDateString()}): ${c.text}`).join('\n') || 'No comments yet'}

**Screenshots:** ${context.imageCount} attached
**Impacted Users:** ${context.impactedUsers}
**Watchers:** ${context.watchers}
**Tags:** ${context.tags.join(', ') || 'None'}

---

Generate a comprehensive Jira ticket with:

1. **Enhanced Title** (concise, actionable, max 255 chars, includes key context like environment)
2. **Detailed Description** in Jira markdown format with these sections:
   - *Summary* (2-3 sentences explaining the issue)
   - *Steps to Reproduce* (infer from description and comments, numbered list)
   - *Expected Behavior* (what should happen)
   - *Actual Behavior* (what is happening)
   - *Environment Details* (browser, device, environment)
   - *Impact Assessment* (severity, affected users, team votes)
   - *Additional Context* (relevant team comments, discussion highlights)
   - *Reporter Information* (who reported, when)
   - *Attachments Note* (mention screenshots if any)
3. **Priority** (map to Jira: Lowest, Low, Medium, High, or Highest based on priority and votes)
4. **Labels** (array of 3-7 relevant lowercase tags based on category, environment, tags)
5. **Components** (if identifiable from description, e.g., "login", "dashboard", "api")
6. **Affects Versions** (if mentioned in description, otherwise empty array)

Return ONLY valid JSON in this exact format:
{
  "title": "string (max 255 chars)",
  "description": "string (Jira markdown format with h1., h2., *bold*, _italic_, {code})",
  "priority": "Lowest|Low|Medium|High|Highest",
  "labels": ["array", "of", "tags"],
  "components": ["component1", "component2"],
  "affectsVersions": []
}

Be concise but thorough. Focus on actionable information. Use Jira markdown syntax (h1., h2., *bold*, _italic_, {code}).`;
  }

  /**
   * Parse AI response
   */
  parseAIResponse(response) {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();

      // Remove ```json and ``` markers
      cleaned = cleaned.replace(/^```json\s*/i, '');
      cleaned = cleaned.replace(/^```\s*/, '');
      cleaned = cleaned.replace(/```\s*$/, '');

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      // Validate required fields
      if (!parsed.title || !parsed.description) {
        throw new Error('Missing required fields');
      }

      // Set defaults for optional fields
      return {
        title: parsed.title.substring(0, 255),
        description: parsed.description,
        priority: parsed.priority || 'Medium',
        labels: Array.isArray(parsed.labels) ? parsed.labels : [],
        components: Array.isArray(parsed.components) ? parsed.components : [],
        affectsVersions: Array.isArray(parsed.affectsVersions) ? parsed.affectsVersions : []
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error.message);
      console.error('Raw response:', response);
      throw new Error('Failed to parse AI response: ' + error.message);
    }
  }

  /**
   * Analyze issue severity and suggest categorization
   */
  async analyzeIssueSeverity(issueId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const prompt = `Based on this issue, assess severity and category:

Title: ${issue.title}
Description: ${issue.description}
Environment: ${issue.environment}
Current Priority: ${issue.priority}
Current Category: ${issue.category}

Return ONLY valid JSON:
{
  "suggestedCategory": "bug|broken_feature|performance|security|ui_ux|enhancement|other",
  "suggestedPriority": "low|medium|high|critical",
  "reasoning": "brief explanation (1-2 sentences)"
}`;

    const response = await aiService.generateWithGemini(prompt, {
      temperature: 0.3,
      maxTokens: 200
    });

    return this.parseAIResponse(response);
  }

  /**
   * Generate suggested title from description
   */
  async generateTitle(description, category = 'bug') {
    const prompt = `Generate a concise, actionable issue title (max 100 chars) from this description:

Description: ${description}
Category: ${category}

Return ONLY a single line title, no JSON, no explanation.`;

    const response = await aiService.generateWithGemini(prompt, {
      temperature: 0.5,
      maxTokens: 50
    });

    return response.trim().replace(/^["']|["']$/g, '');
  }
}

module.exports = new IssueAIService();

import type { UnitSeed } from "./types";

export const unit2: UnitSeed = {
  slug: "salesforce-crm-functionality",
  title: "Salesforce CRM Functionality",
  description:
    "The core CRM objects and processes: accounts and contacts, leads and conversion, opportunities and pipeline, cases and service rules, and the tools that capture and de-duplicate customer data.",
  lessons: [
    {
      slug: "what-is-crm",
      title: "What Is CRM?",
      summary:
        "What customer relationship management actually means, why companies invest in it, and how the main Salesforce clouds map to sales, service and marketing work.",
      contentType: "article",
      isRequired: true,
      content: `## One shared version of the customer

Customer relationship management is both a business strategy and a software category. The strategy is keeping every interaction a company has with its prospects and customers in one shared place, so any team member can pick up where a colleague left off. Before CRM systems, contact history lived in spreadsheets, personal inboxes and individual memory. When a salesperson left, the history left with them; when a customer emailed support, sales never knew.

The strategy also forces a company to decide what it promises customers - who owns an issue, how fast a reply arrives - and the system can then hold people to that promise. The software side is the database that makes the strategy real: shared objects, common field definitions, and reports built from the same records everybody else uses. A CRM is only as good as the discipline behind it, so a big part of the platform's job is to make the disciplined path the easy path - guided stages, sensible defaults, validation rules that reject sloppy data at the point of entry.

## What each team gets out of it

Different functions use the same customer record for different purposes:

- **Sales** works opportunities, tracks pipeline and produces forecasts.
- **Service** handles cases, queues and knowledge articles for customers who need help.
- **Marketing** captures demand through campaigns and lead generation, then measures which campaigns produced revenue.

The greatest value is in the joins between these teams. A support agent opens a case and immediately sees the accounts' open opportunities. A marketer opens a campaign report and sees the leads it produced and the opportunities those leads became. That shared context is the entire point; a CRM with nobody entering data is just an expensive address book.

## Sales Cloud, Service Cloud and Marketing Cloud

Salesforce packages this capability into clouds. Sales Cloud covers account, contact, lead and opportunity management plus forecasting and pipeline reporting. Service Cloud covers cases, assignment and escalation, knowledge, and omni-channel routing for contact centres. Marketing Cloud is a separate platform for outbound email journeys and campaign automation; it integrates with the core CRM rather than living inside it.

Around those sit other products worth recognising: Experience Cloud for customer portals and communities, Commerce Cloud for online selling, CRM Analytics for advanced dashboards, and the platform itself - sometimes called App Cloud - where custom objects, flows and code let you model processes unique to your company.

## Key takeaways

- CRM is a strategy plus a system: one trustworthy, shared view of customers and prospects.
- The payoff comes from handoffs - sales, service and marketing reading the same records.
- Sales Cloud sells, Service Cloud supports, Marketing Cloud runs outbound campaigns.
- Data discipline matters as much as features; capture clean data once rather than fixing it later.`,
      resourceUrl: null,
    },
    {
      slug: "accounts-and-contacts",
      title: "Accounts and Contacts",
      summary:
        "The account and contact data model, how account hierarchies and contact roles add context, and when person accounts make sense.",
      contentType: "article",
      isRequired: true,
      content: `## The account and contact model

An Account represents an organisation - a customer, a prospect, a partner. A Contact represents a person, and a contact normally sits under one primary account. Standard fields such as Account Number, Type and Industry give every team a common vocabulary, so "customer" and "prospect" mean the same thing in a sales report as in a service one. Almost everything else in the CRM hangs off these two objects: opportunities, cases, activities, contracts and quotes all reference an account and usually a contact, which is why analysts call this the account-centric model.

Two structural features add power. The account hierarchy (Parent Account on each account) lets you model subsidiaries and group records under a root company, so a report can roll results up a group. And a contact can relate to more than one account, which handles consultants who sit on several client boards without duplicating their record. Activities - tasks, events and logged emails - attach to both accounts and contacts, producing the timeline that tells you what happened and when.

## Person accounts: the B2C variant

If you sell to individuals rather than companies, forcing a fake Account for every person gets awkward. Person accounts solve this by combining an account and a contact into a single record: one page layout, one search result, but the data satisfies both objects underneath. They are appropriate for business-to-consumer organisations where individuals rarely belong to a company.

Enable them deliberately, not casually. Person accounts change how several standard behaviours work - sharing, some reports, integrations and related-list handling - and an organisation that mixes person accounts with regular business accounts can end up double-counting customers. If your org is business-to-business, the plain Account and Contact model is almost always enough, and the small companies can simply be accounts too.

## Contact roles and why account-centric reporting matters

Not every person matters to every deal. Contact roles let you mark which contacts are involved in a specific opportunity or case and what role they play - decision maker, economic buyer, champion. That is useful during handover, and it feeds reports about which stakeholders were present on won versus lost deals.

Because everything hangs off the account, one page shows the commercial picture: open opportunities, recent cases, key contacts, next activities. Reports then answer questions like revenue by account tier or case volume by customer segment without any data preparation. That is the practical reward for modelling people under accounts rather than as loose lists.

## Key takeaways

- Accounts are organisations and contacts are people; opportunities, cases and activities hang off them.
- Account hierarchies let reports roll up subsidiaries into a parent company.
- Person accounts merge account and contact for B2C orgs - enable them only when the model fits.
- Contact roles record which people matter to a specific opportunity or case.`,
      resourceUrl: null,
    },
    {
      slug: "leads-and-lead-conversion",
      title: "Leads and Lead Conversion",
      summary:
        "Why leads live apart from contacts, how lead status tracks qualification, and what happens - and why - at lead conversion.",
      contentType: "article",
      isRequired: true,
      content: `## Why leads are separate from contacts

A lead is an unqualified prospect: a name, a company, a phone number and a source, usually arriving in bulk from a purchased list, a trade show or a web form. Keeping leads apart from contacts is a deliberate design choice with real benefits. First, it protects data quality: a mass import of five thousand unverified records never touches your trusted customer database. Second, leads have a different lifecycle and a different shape - they track source, rating and qualification status, and they have no opportunities or cases attached yet. Third, they can be owned and routed differently, so a marketing intern can work lead lists without ever seeing closed-won customer records.

The boundary also clarifies terminology in reports. A lead is someone you might do business with; a contact is someone you already track in the context of an account. Conversion is the act of promoting the first into the second.

## The lead lifecycle and lead status

Every lead carries a status value that models qualification progress, not deal progress. A typical set is Open - Not Contacted, Working - Contacted, Closed - Converted and Closed - Not Converted. Status is a picklist you can tune to your process, and stage-like discipline pays off: reps update status as they work, and managers report on conversion rates by source, campaign or owner to find out which lead sources are worth buying again.

Salesforce also lets you automate the start of that lifecycle. Lead assignment rules decide which user or queue owns each new lead based on criteria such as region or product interest, and auto-response rules can send an acknowledgement email to the person who submitted the form.

## Lead conversion

When a lead becomes a real prospect, the user converts it. Conversion creates or links an Account and a Contact, and can optionally create an Opportunity if a deal is actually in play - many conversions stop at the contact because the prospect is not ready to buy. During conversion you decide which record gets the lead's values, and field mapping lets you define which lead fields populate which account and contact fields, so information is not typed twice.

Two details matter. The original lead is marked as converted: it disappears from normal lead lists but remains queryable through the API for reporting. And the campaign that sourced the lead travels with the converted records, so campaign influence can later show that a specific marketing campaign produced a specific opportunity. That link between spend and revenue is why marketers care so much about conversion hygiene.

## Key takeaways

- Leads are a staging area; converting promotes a prospect into trusted account and contact records.
- Lead status tracks qualification, while opportunity stages track deal progress.
- Conversion creates an Account and Contact, optionally an Opportunity, using your field mappings.
- The originating campaign survives conversion, enabling campaign influence and attribution reporting.`,
      resourceUrl: null,
    },
    {
      slug: "opportunities-and-sales-processes",
      title: "Opportunities and Sales Processes",
      summary:
        "Opportunity stages and sales processes, products and line items, and how probability, amounts and forecast categories produce your pipeline.",
      contentType: "article",
      isRequired: true,
      content: `## Stages and sales processes

An Opportunity represents a potential deal: an amount, an expected close date, and a stage describing where the deal sits. Salesforce ships with a long default stage list (Prospecting, Qualification, Needs Analysis, Value Proposition, Id. Decision Maker, Perception Analysis, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost), but you are expected to trim it to match your sales method. A sales process is the mechanism that does this: defined in Setup, attached to an opportunity record type, it supplies the stage values and their order for that process. One org can run a new-business process with six stages and a renewal process with four.

Stages do real work beyond labels. Each stage carries a default probability and a forecast category, and pipeline reports group opportunities by stage. The best practice is to define exit criteria for every stage ("proposal sent", "verbal commitment") so the stage reflects reality rather than optimism - a forecast built on hopeful stages is fiction.

## Products, line items and prices

An opportunity usually sells something. Products are added from a price book, and each addition becomes an opportunity product (a line item) carrying quantity and sales price. Line item totals roll up into the opportunity Amount, so the header figure stays consistent with what was actually quoted. Multiple price books let the same product carry different prices - one per currency, region or customer segment - and reps can see list price versus the price they are proposing when discounting.

## Probability, forecast categories and pipeline

Probability defaults from the stage, and multiplying Amount by Probability gives the weighted value of the pipeline, which is what many executives actually review. Forecast categories group opportunities for forecasting - typically Omitted, Pipeline, Best Case, Commit and Closed - and roll up through the role hierarchy so each manager sees their team's numbers. Because Closed Won opportunities have probability 100 percent and Closed Lost contribute nothing, a clean loss process is as important to forecasting accuracy as an honest win process.

Each opportunity also carries a forecast month derived from its close date, so pushing that date moves the deal into a later forecast period - one more reason to keep it current. Pipeline is simply the set of open opportunities viewed by stage or period. The reports executives live on - pipeline by stage, bookings by close month, conversion from stage to stage - all depend on three fields being kept current: stage, amount and close date.

## Key takeaways

- Opportunity stages track deal progress and default both probability and forecast category.
- Sales processes let different record types run different stage sets in one org.
- Products come from price books; line items build the opportunity Amount.
- Forecasting and pipeline reports are only as honest as stages, amounts and close dates.`,
      resourceUrl: null,
    },
    {
      slug: "service-cloud-and-cases",
      title: "Service Cloud, Cases, Assignment and Escalation Rules",
      summary:
        "How cases represent customer issues, how queues and assignment rules route them, how escalation rules beat the clock, and how email becomes a case.",
      contentType: "article",
      isRequired: true,
      content: `## What a case is

Service Cloud is the customer support side of the CRM, and its unit of work is the Case. A case records an issue or request with a subject, description, status, priority and origin (email, phone, web or chat). Crucially, a case links to a contact and an account, so the agent sees who is asking and everything known about them: open opportunities, contract dates, previous cases. That context is what separates a CRM service desk from a shared inbox.

Cases also carry timestamps that feed the reports service managers care about: how many cases opened, how long they stayed open, how many were reopened. Fields like Case Age and the closure metrics behind service-level agreements are calculated from these records, so keeping status values honest is an operational requirement, not a nicety.

## Queues and assignment rules

A queue owns records that do not belong to a single person yet - a pool of leads or cases that a team works from. Users can be granted access to a queue through their role or profile, and taking a case from the queue transfers ownership to them.

Assignment rules decide where a new case goes. The rule runs when a case is created (especially cases created from web or email), evaluates its entries in order, and the first matching entry assigns the case to a specified user or queue - "Product A issues go to the Platform queue", "VIP customers go to Priya". An optional checkbox sends an email telling the new owner that a case just landed. One rule fires per case, so order your entries from most specific to most general.

## Escalation rules

Assignment rules handle arrival; escalation rules handle the clock. An escalation rule monitors open cases and acts when they age past thresholds - for example, reassigning a case to a manager queue after four hours, raising its priority, or simply notifying a supervisor that a case is at risk. The older time-based style counts from creation or last modification; entitlements and milestones, the newer service-level framework, measure against a contract's promised response times. Either way the principle is the same: escalation reassigns or notifies, it does not block or delete anything.

## Email-to-case

Email-to-case gives each support address a routing address inside Salesforce. Inbound mail is parsed into a case - preserving the from address, subject and thread - and agent replies sent from the case arrive in the customer's inbox with the case reference intact, keeping the whole conversation attached to the record. The original email is stored on the case for audit, and volume is metered per routing address. Combined with assignment and escalation rules, an emailed problem gets an owner and a clock within seconds of arriving.

## Key takeaways

- A Case is the unit of service work, linked to a contact and account for full customer context.
- Queues pool unassigned records; assignment rules route each new case to a user or queue by criteria.
- Escalation rules act on aging cases by reassigning, prioritising or notifying.
- Email-to-case turns incoming support mail into cases with the thread preserved on the record.`,
      resourceUrl: null,
    },
    {
      slug: "automation-integrations",
      title: "Products, Web-to-Lead, Web-to-Case and Duplicate Management",
      summary:
        "Building the product catalogue and price books, capturing demand from your website, and stopping duplicates before they spread.",
      contentType: "article",
      isRequired: true,
      content: `## Products, price books and price book entries

Before opportunities can sell anything, someone builds the catalogue. A Product is the item itself: name, product code, family and an active flag, with no price of its own. A Price Book is a list of prices for a set of products, typically one per currency, region or customer segment - a "2026 EMEA Book", an "Online Store Book". The Price Book Entry is the combination: this product, at this price, in this book. Opportunities select an active price book, and the products reps add come from its entries; each addition becomes a line item whose price can still be adjusted if your rules allow discounting.

Keeping products and books tidy matters downstream: product families drive revenue-by-line reports, inactive products stop appearing in new deals without harming history, and a missing price book entry is the most common reason a rep cannot add an expected product to a deal.

## Capturing demand: web-to-lead and web-to-Case

Web-to-lead generates an HTML form you embed on your website; each submission creates a lead in Salesforce, complete with the campaign source so attribution survives. In practice you add assignment rules so the lead is routed to an owner immediately, and an auto-response rule so the visitor receives a confirmation email within moments - speed to lead is one of the strongest levers on conversion. Keep the form short, and remember the platform enforces a daily cap on web-to-lead volume, so high-traffic sites should integrate through an API instead.

Web-to-case works the same way for support: a public form on your site creates a case directly, optionally with CAPTCHA protection, and the same daily volume ceiling applies. Email-to-case (covered in the previous lesson) is usually the better channel for issues because it preserves conversation threads, while web-to-case suits structured requests.

## Duplicate rules and matching rules

Duplicate Management is Salesforce's framework for keeping data unique, built from two pieces. A matching rule defines what "same record" means - for example an exact match on email address, or a fuzzy match on last name plus company - and can run on standard or custom objects. A duplicate rule then decides what happens when a match is found on create or edit: allow the save, warn the user with an option to view the possible duplicate, or block it outright. Modern duplicate rules also offer real-time alerts during list imports and can report on duplicates that slip through, replacing the older, more limited duplicate-blocking tools. Preventing duplicates at the point of entry is far cheaper than cleansing them later, so configure matching rules before you run your first big import.

## A note on automation: use Flow

The forms and rules in this lesson often trigger further automation - assigning owners, sending alerts, updating fields. Build that in Flow. The older workflow rules and Process Builder are legacy: Salesforce has stopped enhancing them and recommends migrating their actions to Flow, which handles record-triggered, scheduled and screen-based automation in one tool.

## Key takeaways

- Products carry no price alone; price books set prices and entries attach them to products.
- Web-to-lead and web-to-case capture website submissions, and assignment rules route what arrives.
- Matching rules detect possible duplicates; duplicate rules decide whether to warn or block.
- Write new automation in Flow - workflow rules and Process Builder are legacy features.`,
      resourceUrl: null,
    },
  ],
  quiz: {
    title: "Unit 2 Quiz: Salesforce CRM Functionality",
    description: "Check your understanding of leads, opportunities, cases and the tools that capture customer data.",
    passingPercentage: 70,
    maxAttempts: 3,
    questions: [
      {
        questionText: "What problem is customer relationship management fundamentally trying to solve?",
        questionType: "multiple_choice",
        explanation:
          "CRM keeps customer and prospect information in one shared system so that sales, service and marketing all work from the same facts, instead of from private spreadsheets and inboxes.",
        options: [
          {
            text: "Keeping customer information in one shared system so every team works from the same facts.",
            correct: true,
          },
          { text: "Replacing the company's finance and accounting software.", correct: false },
          { text: "Storing the source code of customer-facing applications.", correct: false },
          { text: "Monitoring the company's server hardware for outages.", correct: false },
        ],
      },
      {
        questionText: "On an opportunity, what does the Probability field mainly drive?",
        questionType: "multiple_choice",
        explanation:
          "Probability defaults from the stage, and Amount multiplied by Probability gives the weighted pipeline value that reports and dashboards summarise. It does not calculate discounts or affect products.",
        options: [
          { text: "The weighted value of the pipeline, used when reporting Amount times Probability.", correct: true },
          { text: "The discount percentage automatically applied to every price book entry.", correct: false },
          { text: "The chance a related case will be escalated.", correct: false },
          { text: "Nothing usable - it is a hidden field with no reporting impact.", correct: false },
        ],
      },
      {
        questionText:
          "When a lead is converted, Salesforce always creates an Opportunity, and the user has no way to skip it.",
        questionType: "true_false",
        explanation:
          "Conversion always produces an Account and a Contact, but the Opportunity is optional - if the prospect is not yet a deal, the user simply does not create one.",
        options: [
          { text: "True", correct: false },
          { text: "False", correct: true },
        ],
      },
      {
        questionText: "Which statements about lead conversion are true? Select all that apply.",
        questionType: "multiple_select",
        explanation:
          "Conversion maps lead fields onto the new records, marks the lead as converted so it leaves normal lead lists, and carries the originating campaign forward so campaign influence can be reported - but it never destroys the original lead.",
        options: [
          { text: "Lead field values can be mapped onto fields of the new Account and Contact.", correct: true },
          { text: "The converted lead is marked as converted and drops out of normal lead lists.", correct: true },
          {
            text: "The campaign that sourced the lead can be associated with the converted records.",
            correct: true,
          },
          { text: "The original lead record is permanently deleted during conversion.", correct: false },
          { text: "Conversion can never create an Opportunity, under any circumstances.", correct: false },
        ],
      },
      {
        questionText: "Which statement best describes the difference between a Lead and a Contact?",
        questionType: "multiple_choice",
        explanation:
          "A lead is an unqualified prospect not yet tied to a company record; conversion promotes it into a contact under an account, where it becomes part of the trusted customer database.",
        options: [
          {
            text: "A Lead is an unqualified prospect not yet tied to an Account; a Contact is a person tracked under an Account.",
            correct: true,
          },
          { text: "A Lead is simply an old Contact that has been archived.", correct: false },
          { text: "Contacts cannot appear in reports, only Leads can.", correct: false },
          { text: "Leads are used exclusively by Service Cloud for tracking issues.", correct: false },
        ],
      },
      {
        questionText: "What is the difference between an assignment rule and an escalation rule on cases?",
        questionType: "multiple_choice",
        explanation:
          "Assignment rules run when a case is created and decide who owns it; escalation rules monitor open cases and act when they age past a threshold by reassigning, reprioritising or notifying.",
        options: [
          {
            text: "Assignment rules route new cases to a user or queue; escalation rules act on cases that get too old.",
            correct: true,
          },
          { text: "Assignment rules convert incoming emails into leads.", correct: false },
          { text: "Escalation rules automatically delete cases that are past their due date.", correct: false },
          { text: "Both rules apply only to records created through web forms.", correct: false },
        ],
      },
      {
        questionText: "Your org still uses workflow rules and Process Builder for record automation. What is the modern recommendation?",
        questionType: "multiple_choice",
        explanation:
          "Flow has replaced workflow rules and Process Builder as the platform's automation tool, covering record-triggered, scheduled and screen-based automation in one place, with migration tooling for the older features.",
        options: [
          { text: "Move the automation to Flow, which supersedes workflow rules and Process Builder.", correct: true },
          { text: "Rewrite everything in Apex triggers, because Flow cannot send alerts.", correct: false },
          { text: "Keep them unchanged forever; Salesforce never retires automation features.", correct: false },
          {
            text: "Replace them with validation rules, which perform the same actions.",
            correct: false,
          },
        ],
      },
    ],
  },
};

export default unit2;

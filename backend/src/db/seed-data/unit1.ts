import type { UnitSeed } from "./types";

export const unit1: UnitSeed = {
  slug: "introduction-to-salesforce",
  title: "Introduction to Salesforce",
  description:
    "How Salesforce works underneath the interface: multi-tenant architecture, orgs and sandboxes, the object and relationship model, and the security model that decides who can see what.",
  lessons: [
    {
      slug: "salesforce-overview-and-architecture",
      title: "Salesforce Overview and Architecture",
      summary:
        "How Salesforce runs many customers on shared infrastructure, how orgs and instances fit together, and what the Metadata API actually moves.",
      contentType: "article",
      isRequired: true,
      content: `## A platform, not just an application

Salesforce started as sales automation delivered over the web, but the useful mental model today is that it is an application platform. Objects, fields, page layouts, validation rules, flows and code are all stored inside your org as configuration, and the screens users see are generated from that configuration at runtime. When an administrator renames a field, every page, report and integration picks up the change without anyone editing a source file.

Salesforce is also a hosted service. There is nothing to install on your own servers, users reach it through a browser or the mobile app, and the platform is upgraded automatically three times a year in a process called a seasonal release. Because releases arrive on a fixed schedule, a feature you read about may not appear in your org for months. Always check the release notes for your org's release before you plan around something new.

## Multi-tenancy and the Metadata API

Multi-tenancy means many customer orgs run on the same application servers and database hardware. Your data stays logically separated because every record carries your org's identifier, so a query in your org can never return another company's rows. Because the physical database schema is shared, customers never create real database tables. A custom object you create is metadata - a description held in platform tables - which the platform maps onto shared storage underneath.

That distinction explains the two families of Salesforce APIs. The REST, Bulk and SOAP APIs move data: records in and out of your org. The Metadata API moves the shape of your org: objects, fields, layouts, validation rules, flows and permission sets. Change sets, Salesforce DX source tracking and most CI/CD tooling are built on the Metadata API. Mixing the two up is one of the most common early mistakes, so whenever you are unsure, ask: is this a record or a definition?

## Orgs, instances and releases

An org is one logical Salesforce environment: one set of data, one set of metadata, one set of users, at one URL. An instance (historically called a pod, such as naXX or csXX, and today often a Hyperforce region) is the physical infrastructure that hosts many orgs. Salesforce decides where your org lives and may move it later; you never address the instance directly.

The practical rule is to integrate against your org's My Domain URL and never hardcode an instance hostname. Because traffic is routed through a front-door domain, an instance migration does not change your URLs or your integrations. You will still see instance-level maintenance notices on login pages, and sandboxes may sit on a different instance than production, which is one reason connection details differ between environments.

## Key takeaways

- Your customisations are metadata stored alongside your data, not physical database tables you own.
- Multi-tenancy lets Salesforce run many tenants on shared infrastructure while isolating each org's records.
- The Metadata API moves configuration between orgs; data APIs move records.
- Address your org through My Domain rather than an instance name, and expect three automatic upgrades a year.`,
      resourceUrl: null,
    },
    {
      slug: "environments-and-setup",
      title: "Environments and the Setup Area",
      summary:
        "The difference between production and sandbox orgs, how metadata travels between them, and a tour of Setup and App Manager.",
      contentType: "article",
      isRequired: true,
      content: `## Two kinds of environment

Every customer has at least one production org: the live environment where real users create real records. Because production data matters, changes there should be tested somewhere else first. Sandboxes exist for exactly that reason - copies of your org that you can refresh, break and delete.

Salesforce offers several sandbox types, and they differ mainly in how much data they copy:

| Sandbox | Metadata | Data | Typical use |
| --- | --- | --- | --- |
| Developer | Full copy | Sample data only | Individual development, short experiments |
| Developer Pro | Full copy | Larger sample set | Build and QA with a bit of realistic data |
| Sandbox | Full copy | Copy of production data | System and user-acceptance testing |
| Full Copy | Full copy | Complete copy of production data | Load testing, training, final rehearsals |

Data copies consume storage and refreshing a large sandbox takes time, so treat Full Copy as a scheduled event rather than an everyday tool. Also remember that a sandbox is a separate org: users, records and settings there are not automatically present in production.

## Moving changes between environments

The goal is simple: build and test in a sandbox, then promote the same metadata to production. Change sets are the classic click path - easy to start with, but they only move metadata between orgs on the same instance and they give you little validation. Packages (managed or unlocked) work well for distributing the same code and metadata to several orgs. Most professional teams use Salesforce DX with files in source control and a pipeline that deploys through the Metadata API or the SFDX CLI.

Whichever route you choose, rehearse the deployment path before go-live and remember its limits: the Metadata API moves configuration, not records. Users, data loads and values stored in custom settings have to be migrated separately with data tools.

## The Setup area and App Manager

Setup, reached with the gear icon, is the administration home. A few areas deserve muscle memory: Object Manager for objects, fields, page layouts, validation rules and record types; Users for users, profiles, permission sets and roles; Flows for automation; and the Quick Find box, which is almost always faster than clicking through the tree.

App Manager (Setup -> App Manager) lists the apps in your org. An app is a bundle of tabs, objects and branding that users pick from the App Launcher. From App Manager you create apps, edit or disable existing ones and decide which navigation items appear. Behind each app sits Lightning App Builder, which lets you assemble custom record pages with drag-and-drop components instead of accepting the default page.

## Key takeaways

- Production holds real records; sandboxes exist so you can experiment safely.
- Choose a sandbox by the data it copies: Developer variants carry little, Full Copy carries everything.
- Change sets, packages and pipelines all move metadata, never records.
- Setup's Object Manager and App Manager are the two admin entry points you will use most.`,
      resourceUrl: null,
    },
    {
      slug: "standard-and-custom-objects",
      title: "Standard and Custom Objects",
      summary:
        "What objects are, which standard objects every org starts with, and how to design and create your own custom objects and fields.",
      contentType: "article",
      isRequired: true,
      content: `## What an object is

An object is a table of records with a defined set of fields: Account holds companies, Contact holds people, Opportunity holds deals. Every record has an ID, standard audit fields such as CreatedDate, CreatedBy and LastModifiedDate, and whatever custom fields you add. Because objects are metadata, an administrator can add a field and it immediately appears wherever the object is used - page layouts, reports and the API - without a developer deploying code.

There are three flavours of object in practice. Standard objects ship in every org. Custom objects are the ones you create, and their API names end in __c, for example Invoice__c. External objects mirror data that lives in an external system through Salesforce Connect, so the records can be queried without being copied into your org.

## The standard objects worth learning first

Every CRM conversation starts with a small set of standard objects:

- **Account** - the organisation you do business with.
- **Contact** - a person, usually related to an Account.
- **Lead** - an unqualified prospect that is not yet tied to an Account.
- **Opportunity** - a potential deal with an amount and a stage.
- **Case** - a customer issue or request, the core of Service Cloud.

Learning how these five relate teaches you more about Salesforce data modelling than any feature list: Account to Contact, a Lead converting into an Account, Contact and Opportunity, and a Case raised against the Account that signs the contract.

## Custom objects and field types

Create a custom object when you need to track something the standard objects do not model well: shipments, certifications, machines under maintenance. Start in Object Manager, give the object a label and plural label, choose whether it allows reports and activities, and pick an icon. Then add fields, because choosing the right type early avoids painful data fixes later:

| Field type | Good for | Notes |
| --- | --- | --- |
| Text | Short labels, codes | Up to 255 characters |
| Long Text Area | Notes, descriptions | Long free text, limited filtering |
| Number, Currency | Quantities and money | Currency follows user and org currency |
| Date, Date/Time | Milestones | Date/Time is stored in UTC |
| Picklist, Multi-Select | Bounded choices | Restricted picklists reject other values |
| Checkbox | Flags | Simple true or false |
| Formula | Derived values | Read-only, recalculated on save |
| Roll-Up Summary | Counts and totals on a parent | Master-detail parents only |

Two habits pay off immediately. Prefer a picklist over free text whenever the choices are fixed, so your data stays clean and reportable. And use a formula instead of storing a value you could calculate, so the result can never drift out of date when the inputs change.

## Key takeaways

- Objects are metadata tables; custom object and field API names end with __c.
- Account, Contact, Lead, Opportunity and Case anchor everything in the CRM.
- Match the field type to the data: fixed choices become picklists, derived values become formulas.
- Add fields through Object Manager so they appear automatically on layouts and through the API.`,
      resourceUrl: null,
    },
    {
      slug: "fields-and-relationships",
      title: "Fields, Lookups and Master-Detail Relationships",
      summary:
        "How lookup and master-detail relationships differ in deletion, requiredness and sharing, plus roll-up summaries and Schema Builder.",
      contentType: "article",
      isRequired: true,
      content: `## Two kinds of relationship

Objects become a model when they are connected. Relationship fields link a child record to a parent record, and the type you choose decides how the two behave for the rest of their lives:

| Behaviour | Lookup | Master-Detail |
| --- | --- | --- |
| Child can exist without parent | Yes | No |
| Required on the child | Optional unless you require it | Always required |
| Parent is deleted | Child survives, lookup becomes empty | Child is deleted too |
| Owner of the child | Independent | Follows the master record |
| Sharing | Child has its own sharing settings | Child inherits the master's sharing |
| Roll-up summary on parent | Not possible | Possible |

A lookup is a loose link between two objects that could stand alone - a Contact's "Referred By" lookup to another Contact, or an Account's link to a custom Territory object. A master-detail relationship makes the child part of the parent: an Opportunity Line Item cannot exist without its Opportunity.

## What master-detail actually changes

Because the detail record is never alone, deletion cascades: deleting the master deletes every detail record with it. That is powerful and dangerous, so before you build a master-detail over production data, ask what happens if someone deletes a parent by mistake. There is no undelete for cascaded children in the general case, so consider whether a lookup with a required field would be safer.

Requiredness follows the same logic - the master reference can never be blank, so the field does not even appear as an optional input. Sharing works the same way: detail records have no independent org-wide default of their own, they inherit visibility from the master. If users can see the master, they can see its details; if you lock down the master, the details are locked down with it. Ownership also follows the master, which keeps report grouping consistent.

## Roll-up summaries and Schema Builder

A roll-up summary field lives only on the master object and performs COUNT, SUM, MIN or MAX across its detail records, for example "Number of Open Cases" or "Total Contract Value". The result is real metadata, so reports and formulas can use it directly with no scheduled job to keep it fresh. When the relationship is a lookup, roll-ups are not available and teams instead use reporting, scheduled flows or trusted Apex helpers.

Schema Builder (Object Manager -> Schema Builder) draws your objects and relationships on a canvas. It is excellent for visualising an existing model before you extend it and for creating a cluster of related objects quickly, because changes apply immediately. Remember that it shows structure, not behaviour: it will not tell you which records a user can actually open.

## Key takeaways

- A lookup is a loose link; a master-detail relationship ties lifecycle, ownership and sharing together.
- Detail records cannot outlive their master and cannot have independent sharing.
- Roll-up summaries work only across master-detail relationships.
- Use Schema Builder to map your data model before you build on top of it.`,
      resourceUrl: null,
    },
    {
      slug: "page-layouts-and-validation-rules",
      title: "Page Layouts, Record Types and Validation Rules",
      summary:
        "How page layouts and record types control what users see and choose, and how validation rules block bad data with a clear message.",
      contentType: "article",
      isRequired: true,
      content: `## Page layouts control the form

A page layout decides what the record page looks like: which fields appear, in which order, inside which sections, which related lists are shown, which buttons and actions are available, and which fields are marked read-only or required on the form. Two layouts can display different subsets of the same object's fields, so the layout is about presentation and data entry, not about security. A field hidden by a layout can still be reported on and read through the API unless field-level security hides it too.

Layouts are also where you control the compact layout - the handful of fields in the highlights panel and in Salesforce mobile - and which quick actions sit in the publisher. Changes are made in Object Manager under the object's Page Layouts and take effect for the users that layout is assigned to.

## Record types control the process

A record type is a label attached to a record that selects two things together: which page layout the user sees, and which values are available in the record's picklists. A support org might give a Case two record types, "Problem" and "Feature Request", each with its own layout and its own priority values, so users only choose options that make sense for that process.

Record types are also how you model different business processes: each sales process defines its own set of opportunity stages, each support process its own case statuses. A user can only pick from the record types assigned to their profile, and a record with no record type falls back to the default layout. Two cautions worth memorising: record types do not control who can see a record (that is sharing), and creating record types without also creating layouts and picklist values buys you nothing.

## Validation rules guard the data

A validation rule is a formula that must evaluate to false for a save to succeed. When it evaluates to true, the save is blocked and your error message is shown - either beside a field or at the top of the page. For example, this rule rejects a won opportunity with no money on it:

\`\`\`text
AND( ISPICKVAL( StageName, "Closed Won" ), OR( ISBLANK( Amount ), Amount <= 0 ) )
\`\`\`

Error message: "A Closed Won opportunity must have a positive Amount."

Good rules check what formulas do best: ISBLANK for missing data, ISCHANGED to lock a field after submission, $User and $Profile to vary behaviour by who is editing, and picklist tests to enforce process order. Keep messages instructive rather than scolding - tell the user what to enter instead. Finally, test every rule with one save that should fail and one that should pass before you deploy it to production.

## Key takeaways

- Page layouts shape the form; record types choose the layout and the picklist values for a process.
- Record types do not restrict record visibility - that is the sharing model's job.
- A validation rule blocks the save when its formula returns true, so always show a helpful message.
- Layout-level requirements are presentation; field-level security and validation rules are the real guards.`,
      resourceUrl: null,
    },
    {
      slug: "profiles-permission-sets-and-sharing",
      title: "Profiles, Permission Sets and Sharing",
      summary:
        "How profiles, permission sets, org-wide defaults, role hierarchies and sharing rules add up to record access - and why permission sets now win.",
      contentType: "article",
      isRequired: true,
      content: `## Profiles and permission sets

A profile is the baseline bundle assigned to a user: object permissions, field access, app and tab settings, login hours and IP ranges, and access to Apex classes and Visualforce pages. Every user has exactly one profile. A permission set is a similar bundle that you assign on top of a profile to individual users, without touching the profile itself.

Permissions are additive. A user's effective access is the union of their profile and every permission set assigned to them, so you can layer "Cases Manager" onto five support users instead of cloning their profile into a sixth variant. For that reason modern Salesforce development favours permission sets for most permission granting: keep profiles few and standard, build a permission set per capability, and bundle related sets with permission set groups. Cloned profiles multiply silently, and a one-line change to a shared profile alters every user who has it. A few settings - notably page layout assignment and record type availability - are still tied to profiles, so profiles are not obsolete, just narrower.

## Field-level security and CRUD/FLS

CRUD is the four object permissions - Create, Read, Edit, Delete - plus View All and Modify All, which ignore sharing. Field-level security is independent of all that: it decides whether a user can see or edit one specific field, no matter which page layout is in play. FLS hides the field from the UI, from list views and from reports.

The trap is code. Apex runs in system mode by default, so a trigger or class can read a field the user cannot see unless the developer enforces CRUD and FLS explicitly - by running queries in user mode, by stripping inaccessible fields, or by checking permissions before writing. Newer API endpoints offer a user-mode option that enforces CRUD/FLS for you. Whenever you build, assume that hiding a field is a security decision, not a cosmetic one.

## Org-wide defaults, role hierarchy and sharing rules

Record visibility is built from the bottom up. Start with the Org-Wide Default for the object, which is the baseline when nothing else applies:

- **Public Read/Write** - everyone in the org can read and edit.
- **Public Read Only** - everyone can read; only the owner and their managers edit.
- **Private** - only the owner and users higher in the role hierarchy see the record.

The role hierarchy then opens visibility upward: a manager can always see and edit the records of people below them, regardless of the default. Sharing rules extend access sideways, to peers who are not in the hierarchy - an owner-based rule might share all Accounts owned by the Sales team with Support, and a criteria-based rule might share every Account in region "EMEA" with the European support queue. Manual sharing and Apex sharing are the last resorts. So the order to reason in is: OWD, then hierarchy, then sharing rules, then exceptions.

## Key takeaways

- One profile per user; permission sets layer additive permissions on top of it.
- Prefer permission sets for granting permissions, and keep profiles as small as possible.
- CRUD and field-level security are separate concerns, and Apex must enforce both itself.
- Record access is built from the bottom up: OWD, then role hierarchy, then sharing rules.`,
      resourceUrl: null,
    },
  ],
  quiz: {
    title: "Unit 1 Quiz: Introduction to Salesforce",
    description: "Check your understanding of Salesforce architecture, environments, data modelling and security.",
    passingPercentage: 70,
    maxAttempts: 3,
    questions: [
      {
        questionText:
          "Salesforce stores customisations such as objects, fields and validation rules as metadata rather than as physical database tables. What is the main consequence of that design?",
        questionType: "multiple_choice",
        explanation:
          "Because the underlying schema is shared, customisations are described as metadata and mapped onto shared storage. That is what allows many customer orgs to run on the same infrastructure while their data stays logically separated.",
        options: [
          {
            text: "Many customer orgs can share the same infrastructure while each org's data stays logically separated.",
            correct: true,
          },
          { text: "Each org runs its own private copy of the Salesforce application servers.", correct: false },
          { text: "Custom objects are stored in a database you host yourself.", correct: false },
          { text: "Metadata can only be changed by writing Apex code.", correct: false },
        ],
      },
      {
        questionText: "In a master-detail relationship, a detail record cannot exist without its master record.",
        questionType: "true_false",
        explanation:
          "The master field on a detail record is always required, and deleting the master deletes its detail records as well. If the child must be able to stand alone, a lookup relationship is the right choice.",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
      {
        questionText:
          "You need an environment with a full copy of production data to load-test a new integration before go-live. Which environment should you use?",
        questionType: "multiple_choice",
        explanation:
          "Only a Full Copy sandbox brings over a complete copy of production data. Developer and Developer Pro sandboxes carry metadata plus sample data only, and production must never be used for load testing.",
        options: [
          { text: "A Full Copy (Full) sandbox", correct: true },
          { text: "A Developer sandbox", correct: false },
          { text: "The production org, logged in as a system administrator", correct: false },
          { text: "A Developer Pro sandbox", correct: false },
        ],
      },
      {
        questionText: "Which statements about master-detail relationships are true? Select all that apply.",
        questionType: "multiple_select",
        explanation:
          "Detail records are deleted with their master, always carry a value in the master field, and inherit the master's ownership and sharing - which is also why roll-up summary fields can exist on the master side.",
        options: [
          { text: "Detail records are deleted automatically when the master record is deleted.", correct: true },
          { text: "The master reference on the detail record is always required.", correct: true },
          { text: "A roll-up summary field can be created on the master object.", correct: true },
          {
            text: "Detail records have their own org-wide defaults and can be shared independently of the master.",
            correct: false,
          },
          { text: "A detail record can be saved with no master record at all.", correct: false },
        ],
      },
      {
        questionText:
          "An org's Org-Wide Default for Account is set to Private. Who can normally see an Account owned by another user?",
        questionType: "multiple_choice",
        explanation:
          "With Private, access goes to the owner, to users above the owner in the role hierarchy, and to anyone the record is shared with explicitly. Everything else requires a sharing rule, manual share or elevated permissions.",
        options: [
          {
            text: "Users above the owner in the role hierarchy, plus anyone the record is shared with.",
            correct: true,
          },
          { text: "Every user in the org, because Private only affects reports.", correct: false },
          { text: "Nobody else, not even users higher in the role hierarchy.", correct: false },
          { text: "Only users whose profile has the Read All Objects permission.", correct: false },
        ],
      },
      {
        questionText: "What is the main difference between a page layout and a record type?",
        questionType: "multiple_choice",
        explanation:
          "A page layout arranges the fields on the screen, while a record type selects which layout applies and which picklist values are offered for a given business process. Record types do not restrict record visibility.",
        options: [
          {
            text: "A page layout arranges fields on screen; a record type picks the layout and picklist values for a process.",
            correct: true,
          },
          { text: "A record type arranges fields on screen; a page layout controls field-level security.", correct: false },
          { text: "Both exist only to shape reports.", correct: false },
          {
            text: "Record types control who can see a record, and page layouts control who can edit it.",
            correct: false,
          },
        ],
      },
      {
        questionText: "Why do modern Salesforce projects prefer permission sets for most permission granting?",
        questionType: "multiple_choice",
        explanation:
          "Permission sets are additive and assigned per user, so you can grant extra access without cloning profiles or changing access for everyone who shares a profile. Profiles remain useful for the small set of settings they uniquely control.",
        options: [
          {
            text: "They are additive and assigned per user, so profiles can stay few and standard instead of being cloned.",
            correct: true,
          },
          { text: "Profiles cannot grant object permissions at all.", correct: false },
          { text: "Only one permission set can be assigned to a user at a time.", correct: false },
          { text: "Permission sets are ignored by the role hierarchy.", correct: false },
        ],
      },
    ],
  },
};

export default unit1;

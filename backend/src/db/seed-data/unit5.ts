import type { UnitSeed } from "./types";

export const unit5: UnitSeed = {
  slug: "visualforce-development",
  title: "Visualforce Development",
  description:
    "Visualforce is Salesforce's markup language for building custom pages. In this unit you will write pages with apex: tags and merge fields, display single records and lists with standard and custom controllers, and learn the security rules that keep those pages safe.",
  lessons: [
    {
      slug: "visualforce-introduction",
      title: "Introduction to Visualforce",
      summary:
        "Understand what Visualforce is, where it still fits next to Lightning Web Components, and how a page is put together with the apex:page tag.",
      contentType: "code",
      isRequired: true,
      resourceUrl: null,
      content: `
## What Visualforce is

Visualforce is Salesforce's markup language for custom pages. Like HTML, you write it as a series of tags with attributes, but most of those tags come from the \`apex:\` namespace and are executed on Salesforce servers. When a user opens a page, the platform compiles the markup, runs any Apex code behind it, merges in record data, and sends finished HTML to the browser. Every page is stored in your org as metadata, is reachable at a URL such as \`/apex/AccountSnapshot\`, and is pinned to an API version, so platform upgrades do not silently change how an existing page behaves. That versioning is a big reason pages written many years ago still run today.

Two syntax rules cover most of what you will type. First, \`apex:\` tags must be well formed XML: every tag is either closed (\`</apex:pageBlock>\`) or self closed (\`<apex:outputText value="Done"/>\`), and attribute names are camelCase. Second, anything that is not an \`apex:\` tag is passed straight through to the browser, so you can mix plain \`<p>\`, \`<table>\`, and \`<style>\` markup freely with platform components.

## Visualforce or Lightning Web Components

For brand new custom user interfaces, Lightning Web Components (LWC) are the modern default. LWC are built from standard web technologies (HTML, CSS, and modern JavaScript), they use the same base components and design system as Lightning Experience, and new platform features generally arrive there first. If you are choosing a technology for a new standalone app, a public site, or a rich interactive screen, LWC is usually the right call.

Visualforce is not deprecated, and it is still the right tool in several real situations:

- Embedding a small custom section into an existing page layout, where a full JavaScript build chain would be overkill.
- Quick internal tools and admin screens where server side rendering and very little JavaScript are an advantage.
- PDF output (a page with \`renderAs="pdf"\`) and rich HTML email templates, for which Visualforce remains the simplest path.
- Orgs with heavy Visualforce investment: extending and maintaining working pages, and migrating them to LWC gradually, is usually wiser than a big bang rewrite.

The two technologies coexist. A Visualforce page opened inside Lightning Experience can be restyled with \`lightningStylesheets="true"\`, and Visualforce pages can host Lightning components. A good working rule is: LWC for new custom UI, Visualforce when you are extending classic pages, generating documents, or keeping a proven solution alive.

## Anatomy of a Visualforce page

Every page starts with an \`apex:page\` tag, and the attributes on that tag decide how the whole page behaves:

\`\`\`visualforce
<apex:page standardController="Account"
           lightningStylesheets="true"
           showHeader="false"
           sidebar="false"
           docType="html-5.0">
    <h1>Account snapshot</h1>
    <p>Viewing: {!Account.Name}</p>
</apex:page>
\`\`\`

Here \`standardController="Account"\` ties the page to the Account object and to the record named in the \`id\` URL parameter, so \`/apex/AccountSnapshot?id=001..."\` shows that account. Setting \`showHeader="false"\` and \`sidebar="false"\` gives a clean standalone page (this is also what you want when embedding the page in a page layout). \`lightningStylesheets="true"\` applies Lightning Experience styling to the classic components. \`docType\` chooses the HTML document type; pages default to HTML 4.01 Transitional, and \`html-5.0\` is available when you want modern markup. The line \`{!Account.Name}\` is an expression: the server replaces it with data before the browser ever sees the page.

## Controllers and state: a first look

A Visualforce page always has something behind it deciding what data to show. With \`standardController="Account"\`, the platform provides that logic for you with no Apex at all. With \`controller="MyClass"\`, your own Apex class takes over, and with \`extensions="Ext1,Ext2"\` you can add extra Apex classes to either one. We build all three patterns in the next four lessons.

One more concept to file away for later: when a user clicks a button and the page posts back to the server, Visualforce keeps the controller's state in a hidden field called the view state. Understanding what goes into that state, and how to keep it small, is one of the most important Visualforce skills.

## Key takeaways

- Visualforce pages are server side markup: Salesforce merges tags, expressions, and record data into HTML before the browser renders anything.
- Tags must be well formed, and plain HTML can be mixed freely with \`apex:\` components on the same page.
- LWC are the default choice for new custom UI; Visualforce remains supported and well suited to embedded sections, internal tools, PDFs, and email templates.
- The \`apex:page\` attributes \`standardController\`, \`controller\`, \`extensions\`, \`showHeader\`, \`sidebar\`, \`lightningStylesheets\`, and \`docType\` shape the whole page.
- Expressions such as \`{!Account.Name}\` are evaluated on the server, and controller state survives postbacks in the view state.
`,
    },
    {
      slug: "visualforce-syntax-and-tags",
      title: "Visualforce Syntax and Common Tags",
      summary:
        "Mix HTML with apex: components, use {!...} expressions, merge fields such as {!$Label.CustomLabel}, and control visibility with rendered.",
      contentType: "code",
      isRequired: true,
      resourceUrl: null,
      content: `
## HTML passthrough and apex: tags side by side

A Visualforce page is not a replacement for HTML, it is HTML plus a component library. Any tag without the \`apex:\` prefix is emitted to the browser untouched, so you can write headings, paragraphs, images, and your own CSS exactly as you would in a static page. The \`apex:\` tags are different: they are executed on the server, they can bind to data, and several of them generate the standard Salesforce look and feel. For example, \`<apex:pageBlock>\`, \`<apex:pageBlockSection>\`, and \`<apex:sectionHeader>\` render the classic section chrome your users recognize, while \`<apex:form>\` wraps anything that posts back to the server. One rule to remember early: a Visualforce page can contain only one \`<apex:form>\`, so put all of your buttons and inputs inside a single form.

## Expressions and merge fields

Everything inside \`{! ... }\` is evaluated on the server. The simplest form is a merge field, which walks down an sObject relationship: \`{!Account.Name}\`, \`{!Case.Contact.Email}\`. Expressions can also call functions (\`{!TEXT(TODAY())}\`, \`{!UPPER(subject)}\`) and call methods on the controller (\`{!save}\`, \`{!search}\`). Global variables give you org and user data without any Apex: \`{!$User.FirstName}\` is the running user, \`{!$Label.Support_Page_Title}\` is a custom label your admins can translate, and \`{!$Resource.supportPortalLogo}\` is a static resource uploaded in Setup. Custom labels deserve special attention: putting user facing text in labels instead of hard coding it in markup makes pages translatable and lets admins correct wording without touching code.

\`\`\`visualforce
<apex:page lightningStylesheets="true">
    <h1>{!$Label.Support_Page_Title}</h1>
    <p>Hello {!$User.FirstName} {!$User.LastName}</p>
    <img src="{!$Resource.supportPortalLogo}" alt="Company logo"/>
    <p>Server date: {!TEXT(TODAY())}</p>
</apex:page>
\`\`\`

## The everyday component set

A handful of components cover most real pages:

- \`<apex:form>\` wraps inputs and buttons that post back.
- \`<apex:inputField value="{!Account.Phone}">\` renders the right widget for a field type, enforces field level security, and keeps validation rules working.
- \`<apex:outputField value="{!Account.Phone}">\` displays a field the same way a standard page would, again respecting field level security.
- \`<apex:outputText value="{!note}">\` renders plain text and does not check security, so use it for values you already control.
- \`<apex:commandButton action="{!save}" value="Save">\` and \`<apex:commandLink>\` trigger a controller method on a postback; the link version renders as an anchor.
- \`<apex:pageBlockTable value="{!records}" var="r">\` renders a styled table, and \`<apex:repeat value="{!records}" var="r">\` renders a simple loop.
- \`<apex:facet name="header">\` fills a named sub region such as a table header, and \`<apex:outputPanel>\` is a lightweight wrapper that is often used as an AJAX refresh target.

\`\`\`visualforce
<apex:page standardController="Account" lightningStylesheets="true">
    <apex:form>
        <apex:pageBlock title="Edit Account">
            <apex:pageBlockButtons>
                <apex:commandButton action="{!save}" value="Save"/>
                <apex:commandButton action="{!cancel}" value="Cancel" immediate="true"/>
            </apex:pageBlockButtons>
            <apex:pageBlockSection columns="1">
                <apex:inputField value="{!Account.Name}"/>
                <apex:inputField value="{!Account.Phone}"/>
            </apex:pageBlockSection>
        </apex:pageBlock>
    </apex:form>
</apex:page>
\`\`\`

In this example \`save\` and \`cancel\` are actions built into the standard controller; no Apex is required to edit an account.

## Conditional display with rendered

Conditional display uses the \`rendered\` attribute, which accepts an expression and is evaluated on the server before the HTML is produced:

\`\`\`visualforce
<apex:outputPanel layout="block"
                  rendered="{!Account.Industry == 'Technology'}">
    <p>Thanks for being one of our technology partners.</p>
    <p>Your account team reviews your roadmap every quarter.</p>
</apex:outputPanel>
\`\`\`

Two practical notes. First, a component with \`rendered="false"\` is never sent to the browser, but it is still parsed, so do not reference fields that the page cannot load at all. Second, if a parent is not rendered, nothing inside it renders either. You may see the name \`renderIf\` in older material: that attribute belongs to Aura Lightning components, not to Visualforce, where \`rendered\` is the tool for the job.

## Key takeaways

- Plain HTML passes through untouched; \`apex:\` tags are executed on the server and can bind to data.
- Expressions \`{!...}\` support merge fields, functions, globals such as \`{!$User.FirstName}\`, \`{!$Label.MyLabel}\`, and \`{!$Resource.MyResource}\`, and controller method calls.
- \`apex:inputField\` and \`apex:outputField\` render the right widget for the field type and enforce field level security; \`apex:outputText\` does not.
- Use one \`apex:form\` per page, and use \`rendered\` (not the Aura-only \`renderIf\`) for conditional display.
`,
    },
    {
      slug: "displaying-records",
      title: "Displaying Salesforce Records",
      summary:
        "Load and display one record with a standard controller, render fields safely, and loop over related lists with pageBlockTable, repeat, and facets.",
      contentType: "code",
      isRequired: true,
      resourceUrl: null,
      content: `
## One record, one URL

The quickest way to show Salesforce data is a page with a standard controller and no Apex at all. Declare the object with \`standardController="Account"\` and open the page with a record ID in the URL:

\`\`\`visualforce
<apex:page standardController="Account" lightningStylesheets="true">
    <apex:pageBlock title="{!Account.Name}">
        <apex:pageBlockSection columns="2">
            <apex:outputField value="{!Account.Phone}"/>
            <apex:outputField value="{!Account.Industry}"/>
            <apex:outputField value="{!Account.OwnerId}"/>
            <apex:outputField value="{!Account.LastModifiedDate}"/>
        </apex:pageBlockSection>
    </apex:pageBlock>
</apex:page>
\`\`\`

The URL looks like \`/apex/AccountSnapshot?id=001XXXXXXXXXXXX\`. The standard controller loads that record and exposes it under the object's name, so \`{!Account.Name}\` and the lower case form \`{!account.name}\` both work. Two important behaviors come for free. The controller runs as the running user, so object permissions and sharing rules are respected: if the user cannot read the record, the page does not hand it over. And if the \`id\` parameter is missing or the record type does not match, the page shows an error instead of silently rendering blanks.

## outputField enforces field level security

Prefer \`<apex:outputField>\` over \`<apex:outputText>\` for anything that comes from a record. An output field knows the field's type, so it formats dates and currencies by the user's locale, renders a user or lookup as a link, and, most importantly, hides the value entirely when the running user is not allowed to see that field. \`<apex:outputText value="{!Account.AnnualRevenue}">\` would print the number regardless of field level security. The same is true of raw expressions in HTML: \`<p>{!Account.AnnualRevenue}</p>\` bypasses the check. This is the single most common security mistake in beginner Visualforce code.

## Iterating related lists

Child records come along for the ride. Visualforce expressions can walk to child relationship lists, so a table of an account's contacts needs no controller code:

\`\`\`visualforce
<apex:pageBlockTable value="{!Account.Contacts}" var="c" rows="5">
    <apex:column value="{!c.Name}"/>
    <apex:column value="{!c.Email}"/>
    <apex:column>
        <apex:facet name="header">Title</apex:facet>
        <apex:outputText value="{!c.Title}"/>
    </apex:column>
</apex:pageBlockTable>
\`\`\`

Inside the table, \`var="c"\` names the current row and each \`<apex:column>\` binds to a property of that row. A \`<apex:facet>\` fills a named slot in its parent component; here it supplies the column header, which is handy when the header text is not a simple field label. When you want the real Salesforce related list UI (with its buttons and counts) instead of a custom table, one line does the job: \`<apex:relatedList list="Contacts" subject="{!Account.Id}"/>\`.

## Loops with apex:repeat

For anything that is not tabular data, \`<apex:repeat>\` is the simpler iterator. It produces a plain list without table markup, which is exactly what you want when the page's own CSS should control the layout:

\`\`\`visualforce
<apex:repeat value="{!Account.Contacts}" var="c" rows="3" id="contactRepeat">
    <li>
        <strong>{!c.Name}</strong> - {!c.Email}
        <apex:outputText value="{!c.Title}"/>
    </li>
</apex:repeat>
\`\`\`

The \`rows\` attribute limits the output, and the optional \`varStatus\` variable gives you the index of the current row, which is useful for alternating CSS classes or showing a row count. Both repeat and pageBlockTable render on the server every time the page is requested or posted back, so keep the lists you loop over modest in size. When a page needs to query more than a related list can provide, that is the moment to reach for a controller, which is where we are heading next.

## Key takeaways

- \`standardController="Object"\` plus an \`?id=...\` URL parameter loads a single record with no Apex.
- The standard controller runs as the user, so sharing rules and object permissions are enforced automatically.
- \`apex:outputField\` formats by field type and enforces field level security; \`apex:outputText\` and raw expressions do not.
- \`apex:pageBlockTable\` and \`apex:repeat\` iterate lists using a \`var\` variable, and \`apex:facet\` fills slots such as table headers.
- \`<apex:relatedList list="Contacts" subject="{!Account.Id}"/>\` renders a real related list in one line.
`,
    },
    {
      slug: "controllers-standard-and-list",
      title: "Standard Controllers and Standard List Controllers",
      summary:
        "Use standard controllers and standard list controllers to show, filter, and page through records with almost no Apex code.",
      contentType: "code",
      isRequired: true,
      resourceUrl: null,
      content: `
## What a standard controller gives you

A standard controller is platform provided Apex that models one object. It loads the record named in the \`id\` URL parameter, exposes it under the object name, and brings a set of ready made actions: \`save\`, \`quicksave\`, \`cancel\`, \`edit\`, \`delete\`, and \`list\`. That is why the edit example in the last unit worked with no controller class: \`<apex:commandButton action="{!save}" value="Save"/>\` calls the standard save action, which performs DML, runs validation rules and triggers, and redirects to the record. Because the platform owns this logic, CRUD checks, sharing rules, and field level security all behave exactly as they do on standard pages. Use a standard controller whenever your page is fundamentally "show or edit this object".

You can add behavior without giving up these benefits by writing a controller extension, which we cover in the next lesson. Extensions receive the standard controller in their constructor and can add methods while the built in actions keep working.

## Standard list controllers and pagination

Add the \`recordSetVar\` attribute to a page with a standard controller and it becomes a set oriented standard list controller. The value of \`recordSetVar\` names a list of records that your page can loop over, and the platform adds pagination methods for free:

\`\`\`visualforce
<apex:page standardController="Opportunity" recordSetVar="opps"
           pageSize="10" lightningStylesheets="true">
    <apex:form>
        <apex:pageBlockTable value="{!opps}" var="o">
            <apex:column value="{!o.Name}"/>
            <apex:column value="{!o.StageName}"/>
            <apex:column value="{!o.Amount}"/>
        </apex:pageBlockTable>
        <apex:commandButton action="{!previous}" value="Previous"/>
        <apex:commandButton action="{!next}" value="Next"/>
    </apex:form>
</apex:page>
\`\`\`

Here \`pageSize="10"\` on \`apex:page\` controls how many records a page of results contains, and \`{!previous}\` and \`{!next}\` are actions supplied by the standard list controller; \`{!first}\` and \`{!last}\` are available too. The set of records is the one from the currently selected list view, so different users may legitimately see different rows.

## Filtering with list views

When the point of the page is to reproduce a list view, you do not have to rebuild one. The \`<apex:enhancedList>\` component renders the real list view picklist and grid for an object:

\`\`\`visualforce
<apex:page lightningStylesheets="true">
    <h1>Account list views</h1>
    <apex:enhancedList type="Account" height="320" rowsPerPage="25"/>
    <!-- To pin one specific view, use its ID instead of type: -->
    <!-- <apex:enhancedList listId="00B..." height="320" rowsPerPage="25"/> -->
</apex:page>
\`\`\`

The \`type\` attribute is the object whose views are shown, \`height\` is required and measured in pixels, and \`rowsPerPage\` accepts the same values users can pick in Salesforce (10, 25, 50, 100, or 200). Use \`listId\` instead of \`type\` when you want one specific list view. There are three constraints worth knowing before you design around it: the component needs a page that shows the standard header (so \`showHeader="false"\` is not an option), a page can contain at most five of them, and if you refresh one with AJAX it must sit inside an \`<apex:outputPanel layout="block">\`. The related \`<apex:listViews type="Account"/>\` component renders just the list view picklist for custom tab pages, and a standard list controller page can also be pointed at a specific view by putting that view's ID in the \`fcf\` URL parameter, the same way classic list URLs work.

## Putting a page on a page layout

The most common production use of these pages is a custom section on an existing record page. Build a page with \`standardController="Account"\` and \`showHeader="false" sidebar="false"\`, then open the object's page layout in Setup, drag a section onto the layout, and change its type to a Visualforce section, choosing your page and a height. Salesforce passes the record ID automatically, so the embedded page always shows the record being viewed. Users need read access to the object and, in their profile, access to the Visualforce page itself. In Lightning Experience these embedded sections still render, and adding \`lightningStylesheets="true"\` makes them blend with the surrounding Lightning UI.

## Key takeaways

- A standard controller supplies record loading plus built in actions such as save and cancel, with security enforced for free.
- Adding \`recordSetVar\` turns the page into a standard list controller, giving you \`first\`, \`previous\`, \`next\`, and \`last\` actions and a \`pageSize\` attribute.
- \`<apex:enhancedList>\` renders a real list view; remember the required \`height\`, the five per page limit, and the need for a page header.
- Visualforce sections on page layouts receive the record ID automatically, which is the simplest way to extend an existing page.
`,
    },
    {
      slug: "custom-controllers-and-extensions",
      title: "Custom Controllers and Controller Extensions",
      summary:
        "Write custom controllers and controller extensions: properties, methods, save actions, error messages, and the limits of view state.",
      contentType: "code",
      isRequired: true,
      resourceUrl: null,
      content: `
## Writing a custom controller

A custom controller is an Apex class that a page uses instead of a standard controller, declared with \`controller="MyClass"\` on \`apex:page\`. It is a normal public Apex class: public properties with getters and setters back your expressions, and public no argument methods back your buttons. This page searches orders without any standard controller behavior:

\`\`\`apex
public with sharing class OrderSearchController {
    public String searchKey { get; set; }
    public List<Order__c> results { get; set; }

    public OrderSearchController() {
        results = new List<Order__c>();
    }

    public void search() {
        String key = String.escapeSingleQuotes(searchKey);
        results = [SELECT Name, Status__c, Total__c FROM Order__c
                   WHERE Name LIKE :key ORDER BY CreatedDate DESC LIMIT 50];
    }
}
\`\`\`

Binding this page with \`controller="OrderSearchController"\` makes \`{!searchKey}\` two way: it feeds the input, and typing into the input updates the variable. \`<apex:commandButton action="{!search}" value="Search"/>\` calls the method on a postback, and \`{!results}\` feeds the results table.

One design decision matters above all others: this class declares \`with sharing\`, so the query is filtered by the user's sharing rules. A class that declares neither \`with sharing\` nor \`without sharing\` runs in system mode when a Visualforce page instantiates it directly, which means it can read and write records the user is not allowed to see. That can be exactly what you want for system processes, but on a user facing page it is usually a data leak waiting for a security review. Also remember that custom controller Apex does not enforce field level security; check it explicitly if your page shows fields the user might not be licensed to see.

## Controller extensions

An extension does not replace the standard controller, it extends it. The class is bound with \`extensions="..."\`, and its constructor must accept the controller it extends: \`ApexPages.StandardController\` for a single record page, or \`ApexPages.StandardSetController\` for a page that uses \`recordSetVar\`. The standard controller's own methods (save, cancel, and friends) keep working.

\`\`\`apex
public with sharing class AccountScoreExtension {
    private final Account acct;
    public Integer openCases { get; private set; }

    public AccountScoreExtension(ApexPages.StandardController stdController) {
        this.acct = (Account) stdController.getRecord();
        this.openCases = [SELECT COUNT() FROM Case
                          WHERE AccountId = :acct.Id AND IsClosed = false];
    }

    public PageReference recalculate() {
        ApexPages.addMessage(ApexPages.Severity.INFO,
                             'Open cases right now: ' + openCases);
        return null;
    }
}
\`\`\`

The page declares \`standardController="Account" extensions="AccountScoreExtension"\`, and \`stdController.getRecord()\` returns the record the page loaded, so the extension can query with a bind variable instead of parsing the URL. A method that returns a \`PageReference\` controls navigation: return null to stay on the page, or return a PageReference such as \`new ApexPages.StandardController(acct).view()\` to redirect. A method that returns \`void\` also stays on the page, which is what you want for AJAX refreshes.

## Error messages your users can see

When validation fails, show the message on the page rather than throwing the user to an error screen. \`ApexPages.addMessage\` queues a message, and \`<apex:pageMessages/>\` or \`<apex:messages/>\` anywhere on the page displays the queue:

\`\`\`apex
public PageReference saveOrder() {
    if (String.isBlank(orderName)) {
        ApexPages.addMessage(ApexPages.Severity.ERROR,
                             'Enter an order name before saving.');
        return null;
    }
    upsert new Order__c(Id = recordId, Name = orderName);
    return null;
}
\`\`\`

\`<apex:pageMessages/>\` renders every message with the platform's standard message styling, while \`<apex:message/>\` is meant for one field at a time and renders inside that field's form item.

## View state and its limits

Everything your controller holds between postbacks is serialized into a hidden form field called the view state. Public properties without \`transient\` go into it, so a large query result or a big sObject makes the page slow to post back. The hard limit is roughly 170 KB, and exceeding it produces the familiar view state error. Mark cache only properties \`transient\`, query only the rows you need, and consider \`<apex:page readOnly="true">\` for pages that never write, which raises the limit and skips much of the postback overhead.

## Key takeaways

- A custom controller is a public Apex class whose properties back expressions and whose methods back buttons, bound with \`controller="..."\`.
- Declare \`with sharing\` unless you deliberately need system mode, and enforce field level security yourself in custom Apex.
- An extension constructor takes \`ApexPages.StandardController\` (or \`StandardSetController\`) and keeps the standard actions working.
- Return a \`PageReference\` to navigate or \`null\` to stay put; use \`ApexPages.addMessage\` with \`<apex:pageMessages/>\` for friendly errors.
- Keep the view state small: mark unused properties \`transient\` and respect the 170 KB limit.
`,
    },
    {
      slug: "visualforce-security-and-best-practices",
      title: "Visualforce Security and Best Practices",
      summary:
        "Apply the sharing model, enforce CRUD and field-level security, prevent SOQL injection and XSS, and follow Visualforce best practices.",
      contentType: "code",
      isRequired: true,
      resourceUrl: null,
      content: `
## Who is the page running as

Every Visualforce page runs in the context of the user viewing it. The record ID in the URL, the running user's permissions, and their sharing rules all apply, which is why a standard controller can safely power a public facing page. The important exception is Apex: a custom controller or extension executes in system mode unless it declares \`with sharing\`, and Apex does not check field level security on its own. So the enforcement duties split neatly. Standard components (\`apex:inputField\`, \`apex:outputField\`) handle field level security for you; your Apex must handle object and record access. A practical pattern is to declare the class \`with sharing\`, then use the Apex security APIs to strip fields the user cannot read before placing them on the page.

## The sharing model

The three forms to know are \`with sharing\`, \`without sharing\`, and undeclared. \`with sharing\` respects role hierarchy, sharing rules, and manual shares, so queries return only records the user can see. \`without sharing\` runs as system and can touch any record. Undeclared classes inherit the calling context, and when a Visualforce page instantiates them directly they behave as system mode code. Choose deliberately, write the keyword in the class declaration, and explain the choice in a comment: record visibility bugs are hard to test and easy to ship.

## SOQL injection and cross site scripting

Never build SOQL by pasting user input into a string. A value like \`x' OR '1'='1\` closes the quote and turns your query into someone else's query. Bind variables treat the value as data, and \`String.escapeSingleQuotes\` handles dynamic pattern building:

\`\`\`apex
// Vulnerable: input becomes part of the query text
String soql = 'SELECT Id FROM Contact WHERE LastName = ' + input;

// Safe: the bind variable keeps the value out of the query
List<Contact> hits = Database.query('SELECT Id FROM Contact WHERE LastName = :input');

// For LIKE patterns, escape before concatenation is unavoidable
String safe = String.escapeSingleQuotes(input);
\`\`\`

Cross site scripting is the mirror image problem on the output side. Visualforce escapes merge field output by default, which neutralizes embedded scripts in record data, and that default is your main defense. Components such as \`<apex:outputText>\` expose an \`escape\` attribute that defaults to true; turning it off means the browser will render whatever markup the value contains:

\`\`\`visualforce
<!-- Safe: the platform escapes the value -->
<apex:outputText value="{!Case.Description}"/>

<!-- Only for rich text you generated yourself, never for user input -->
<apex:outputText value="{!trustedRichText}" escape="false"/>
\`\`\`

Treat any \`escape="false"\` as a code review red flag, and remember that an escape switch in your markup defeats the protection for that output everywhere, for every user.

## Documents, emails, and habits worth keeping

Two Visualforce features remain genuinely popular. PDF generation is a one attribute affair: \`<apex:page renderAs="pdf" standardController="Opportunity">\` renders the same markup as a downloadable document, which is ideal for quotes, orders, and reports. Visualforce email templates let you build rich HTML emails with merge fields and attachments from Apex, which the standard template builder cannot match. The same security rules apply to both: they run the same Apex and honor the same sharing and security model.

Beyond security, a few habits produce better pages. Prefer standard controllers and extensions over reinventing record access, keep expressions simple, and put user facing text in custom labels so admins can translate and correct it. Keep the view state small with \`transient\` and \`readOnly="true"\` where it fits, add \`lightningStylesheets="true"\` so pages look at home in Lightning Experience, and always test a page as a low privilege user rather than only as an administrator. Finally, remember that a new user interface is usually better built as a Lightning Web Component; reach for Visualforce when you are extending classic pages, generating documents, or maintaining something that already works.

## Key takeaways

- Pages run as the viewing user, but custom Apex runs in system mode: use \`with sharing\` and enforce field level security explicitly.
- Undeclared sharing behaves like system mode when a Visualforce page instantiates the class directly, so always declare your intent.
- Prevent SOQL injection with bind variables and \`String.escapeSingleQuotes\`, and prevent XSS by keeping the default output escaping on.
- \`renderAs="pdf"\` and Visualforce email templates remain the go to tools for documents and rich email.
- Validate your security with a low privilege test user, and prefer Lightning Web Components for new custom UI.
`,
    },
  ],
  quiz: {
    title: "Unit 5 Quiz: Visualforce Development",
    description:
      "Check your understanding of Visualforce syntax, controllers, view state, and the security rules that keep these pages safe.",
    passingPercentage: 70,
    maxAttempts: 3,
    questions: [
      {
        questionText: `A developer creates this page and opens it at \`/apex/AccountSnapshot\`:

\`\`\`visualforce
<apex:page standardController="Account">
    <h1>{!Account.Name}</h1>
</apex:page>
\`\`\`

What is required for {!Account.Name} to display an account name?`,
        questionType: "multiple_choice",
        explanation:
          "A standard controller loads the record identified by the id URL parameter and exposes it under the object's name. Without an id parameter there is no record, so the expression renders empty.",
        options: [
          {
            text: "The URL must include the account's record ID, for example /apex/AccountSnapshot?id=001...",
            correct: true,
          },
          {
            text: "The page must also declare extensions=\"AccountController\" so the name can be loaded.",
            correct: false,
          },
          {
            text: "The developer must query the account in a constructor and store it in a public list first.",
            correct: false,
          },
          {
            text: "Nothing else is needed; {!Account.Name} always renders the first account in the org.",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "A page must show the AnnualRevenue field only for users who are allowed to see it. Which component enforces field-level security automatically?",
        questionType: "multiple_choice",
        explanation:
          "apex:outputField and apex:inputField respect field-level security and render the field the way standard pages do. apex:outputText and raw expressions such as {!Account.AnnualRevenue} display the value regardless of the user's field permissions.",
        options: [
          {
            text: "<apex:outputField value=\"{!Account.AnnualRevenue}\"/>",
            correct: true,
          },
          {
            text: "<apex:outputText value=\"{!Account.AnnualRevenue}\"/>",
            correct: false,
          },
          {
            text: "<p>Revenue: {!Account.AnnualRevenue}</p>",
            correct: false,
          },
          {
            text: "<apex:repeat value=\"{!Account.AnnualRevenue}\" var=\"r\"/>",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "True or false: a class declared as `public class PortalController { ... }`, with neither `with sharing` nor `without sharing`, applies the org's sharing rules when a Visualforce page instantiates it directly.",
        questionType: "true_false",
        explanation:
          "When a Visualforce page instantiates a class that declares no sharing mode, the class behaves as system mode code and ignores sharing rules, so it can expose records the user cannot see. Declare with sharing unless system-mode access is deliberate.",
        options: [
          { text: "True", correct: false },
          { text: "False", correct: true },
        ],
      },
      {
        questionText:
          "Select the three practices that make a Visualforce page more secure.",
        questionType: "multiple_select",
        explanation:
          "Bind variables, the with sharing keyword, and the default output escaping are the core defenses against SOQL injection, over-broad record access, and XSS. Browsers do not sanitize output for you, and apex:outputText does not enforce field-level security.",
        options: [
          {
            text: "Build SOQL with bind variables instead of concatenating user input.",
            correct: true,
          },
          {
            text: "Declare the controller with sharing so record visibility is respected.",
            correct: true,
          },
          {
            text: "Keep the default output escaping and only set escape=\"false\" for markup you fully control.",
            correct: true,
          },
          {
            text: "Set escape=\"false\" on the page so browsers sanitize the output for you.",
            correct: false,
          },
          {
            text: "Rely on apex:outputText to enforce field-level security.",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "What is the view state of a Visualforce page, and why does it matter?",
        questionType: "multiple_choice",
        explanation:
          "The controller's state between postbacks is serialized into a hidden form field, and the platform enforces a limit of roughly 170 KB. Large query results bloat the view state, so developers mark unused properties transient and keep lists small.",
        options: [
          {
            text: "It is the portion of controller state serialized into a hidden form field so it survives postbacks, limited to about 170 KB.",
            correct: true,
          },
          {
            text: "It is a server-side cache of compiled Visualforce markup, keyed by the page's API version.",
            correct: false,
          },
          {
            text: "It is the list of fields the standard controller loads the first time the page renders.",
            correct: false,
          },
          {
            text: "It is a browser cookie set by apex:form so users stay signed in between postbacks.",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "A page uses `standardController=\"Opportunity\"` (a single record, with no recordSetVar). Which constructor correctly starts a controller extension for it?",
        questionType: "multiple_choice",
        explanation:
          "An extension for a single-record standard controller must accept ApexPages.StandardController in its constructor. ApexPages.StandardSetController is the parameter type for set-oriented pages that declare recordSetVar.",
        options: [
          {
            text: "public OppExtension(ApexPages.StandardController std) { /* ... */ }",
            correct: true,
          },
          {
            text: "public OppExtension() { /* ... */ }",
            correct: false,
          },
          {
            text: "public OppExtension(Opportunity o) { /* ... */ }",
            correct: false,
          },
          {
            text: "public OppExtension(ApexPages.StandardSetController std) { /* ... */ }",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "A custom controller needs to show a validation error to the user when a required value is missing. Which approach is correct?",
        questionType: "multiple_choice",
        explanation:
          "ApexPages.addMessage queues a message for the current page, and apex:messages or apex:pageMessages renders that queue anywhere on the page. apex:message is for a single field's errors, and an unhandled exception produces an error page rather than an inline message.",
        options: [
          {
            text: "Call ApexPages.addMessage(new ApexPages.Severity.ERROR, 'msg') in the controller and place <apex:pageMessages/> on the page.",
            correct: true,
          },
          {
            text: "Use <apex:message/> on its own, since that component displays every message the controller adds.",
            correct: false,
          },
          {
            text: "Throw an unhandled exception; Visualforce turns it into a friendly inline message above the form.",
            correct: false,
          },
          {
            text: "Call System.debug('msg') with logging set to Fine; the text appears at the top of the page.",
            correct: false,
          },
        ],
      },
    ],
  },
};

export default unit5;

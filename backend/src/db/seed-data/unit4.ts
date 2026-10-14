import type { UnitSeed } from "./types";

const unit4: UnitSeed = {
  slug: "apex-programming-development",
  title: "Apex Programming Development",
  description:
    "Build production-ready Apex: triggers and their context variables, handler patterns and bulkification, test classes, governor limits and asynchronous Apex.",
  lessons: [
    {
      slug: "trigger-fundamentals",
      title: "Apex Trigger Fundamentals",
      summary:
        "Triggers run Apex automatically in response to DML. Learn what a trigger is, the six events it can subscribe to, and how triggers are structured.",
      contentType: "code",
      isRequired: true,
      content: `## What a trigger is

A trigger is a piece of Apex that the platform runs automatically in response to a data change on an sObject. Declarative automation covers a great deal: validation rules block bad input, flows orchestrate steps, assignment rules route records. Triggers exist for the moments when code needs full control, such as transforming values as they are saved, coordinating updates across several objects in a fixed order, or handing data to an integration at exactly the right point.

A trigger has a name, one target sObject and a list of events. The code inside is a block rather than a method, and it runs in the middle of the save operation, which means changes you make to the records in memory are part of what gets stored.

\`\`\`apex
trigger AccountTrigger on Account (before insert, before update) {
    for (Account a : Trigger.new) {
        if (String.isBlank(a.Name)) {
            a.Name = 'Unnamed account';
        }
    }
}
\`\`\`

## Before and after events

Every DML statement on an sObject can fire triggers at two moments. Before triggers run while the record is being validated and before it is written to the database, which makes them the place to enforce defaults, normalise text or block the save. After triggers run once the records exist, which makes them the place to update related records, create children or call other services, because ids are available and changes are visible to the rest of the transaction.

The six standard events are before insert, before update, before delete, after insert, after update and after delete, plus undelete, which fires when records are restored from the recycle bin. You list the ones you need in the trigger header and can subscribe to several at once.

One structural rule is worth internalising early: write one trigger per sObject. If two triggers are defined on the same object, the order in which they fire is not something you should rely on, so teams route everything through a single trigger that delegates by event.

## Specific objects and the generic form

The normal form names the sObject after the on keyword, as in trigger AccountTrigger on Account, and the trigger then only fires for that object. Apex also allows a generic form that subscribes to every sObject at once, writing sObject in place of an object name. In that style the records arrive untyped, so every field access has to go through describe calls and dynamic SOQL, and the trigger must branch on the object type for every action. Real projects use the generic form rarely, for platform-wide housekeeping only, and use one specific trigger per object for everything else.

## Key takeaways

- A trigger runs Apex automatically in response to DML on an sObject, at a precise point inside the save.
- Before triggers change or block records before they are stored; after triggers react once ids exist.
- The events are before and after combinations of insert, update and delete, plus undelete.
- Write one trigger per sObject, because multiple triggers on one object have undefined firing order.
- A generic sObject trigger exists for platform-wide logic, but specific triggers keep code typed and readable.`,
    },
    {
      slug: "trigger-events-and-context",
      title: "Trigger Events and Context Variables",
      summary:
        "Trigger context variables tell a trigger what happened and which records are involved: isBefore, isInsert, new, old, newMap, oldMap and size.",
      contentType: "code",
      isRequired: true,
      content: `## Event booleans

Inside a trigger block the platform exposes a set of static variables describing the current invocation. Trigger.isBefore and Trigger.isAfter tell you which moment you are in. Trigger.isInsert, Trigger.isUpdate, Trigger.isDelete and Trigger.isUndelete tell you which event fired. Because one trigger usually subscribes to several events, the body starts by branching on these booleans so each branch only sees records it understands. Trigger.isExecuting confirms the code is running inside a trigger rather than a normal Apex context, which is handy when a handler method is also called from tests or a batch job.

\`\`\`apex
trigger AccountTrigger on Account (before insert, before update, after delete) {
    if (Trigger.isBefore && Trigger.isInsert) {
        System.debug('Creating ' + Trigger.size + ' accounts');
    } else if (Trigger.isAfter && Trigger.isDelete) {
        System.debug('Removed ' + Trigger.size + ' accounts');
    }
}
\`\`\`

## The record collections

Trigger.new is a list of the records in their current, in-memory version. It is the main way to read incoming values, and in before triggers it is also the only collection you may modify, which is how triggers change what gets saved. Trigger.old is a list of the previous versions of the records and is always read-only, because its whole purpose is comparison against the new values.

Two maps save you from nested loops. Trigger.newMap is keyed by Id and holds the new versions, and Trigger.oldMap holds the old versions, so you can look up a single previous record by id while iterating. Trigger.size is simply the number of records in the batch, and it equals Trigger.new.size() or Trigger.old.size() depending on the event.

## Which collections exist for which event

The availability rules follow from what the records mean at each moment. In insert triggers there is no previous version of anything, so Trigger.old and Trigger.oldMap do not exist, and touching them throws an SObjectException. In delete triggers the records are going away, so Trigger.new and Trigger.newMap do not exist. Old and oldMap are available in update and delete triggers; new and newMap are available in insert and update triggers. Another rule to remember: Trigger.old is read-only everywhere, and Trigger.new becomes read-only once you cross into an after trigger, because the records are already saved and the platform will not let you mutate them behind its back.

A practical pattern is to capture the event flags once at the top of a handler method and branch on the differences you care about. Maps shine when an after trigger must compare current and previous values for many records at once, because the oldMap lookup costs nothing while a second query would cost one of your one hundred. Get into the habit of asking which collections are legal for the event you are handling before you write the first line of the body, because the wrong variable raises an SObjectException at runtime that no compiler warning predicted.

\`\`\`apex
trigger ContactTrigger on Contact (before update) {
    for (Contact c : Trigger.new) {
        Contact beforeRec = Trigger.oldMap.get(c.Id);
        if (beforeRec.LastName != c.LastName) {
            c.Description = 'Name changed at ' + Datetime.now().format();
        }
    }
}
\`\`\`

## Key takeaways

- Trigger.isBefore, isAfter, isInsert, isUpdate, isDelete and isUndelete identify exactly which invocation is running.
- Trigger.new holds current versions and is the only editable collection, and only in before triggers.
- Trigger.old holds previous versions, is always read-only, and does not exist in insert triggers.
- Trigger.newMap and Trigger.oldMap give Id-based lookup, and Trigger.size reports the batch size.
- Trigger.new does not exist in delete triggers, so reading it there raises an SObjectException.`,
    },
    {
      slug: "trigger-handlers-and-bulkification",
      title: "Trigger Handlers and Bulkification",
      summary:
        "Keep triggers thin by delegating to handler classes, stop recursion, and write code that works for one record or two hundred.",
      contentType: "code",
      isRequired: true,
      content: `## The handler pattern

A trigger body should decide which event happened and then hand the work to a plain Apex class. That class, called a handler, contains static methods that receive the records and do the real work. The payoff is structure: the trigger stays a few lines long, the logic becomes callable from tests and batch jobs without a trigger context, and each event gets its own named method instead of an anonymous nest of conditions.

\`\`\`apex
trigger AccountTrigger on Account (before insert, before update, after update) {
    if (Trigger.isBefore && Trigger.isInsert) {
        AccountHandler.beforeInsert(Trigger.new);
    } else if (Trigger.isBefore && Trigger.isUpdate) {
        AccountHandler.beforeUpdate(Trigger.new, Trigger.oldMap);
    } else if (Trigger.isAfter && Trigger.isUpdate) {
        AccountHandler.afterUpdate(Trigger.new, Trigger.oldMap);
    }
}
\`\`\`

The handler looks like ordinary Apex, which means it is easy to unit test directly.

\`\`\`apex
public class AccountHandler {
    public static void beforeInsert(List<Account> records) {
        for (Account a : records) {
            if (String.isBlank(a.Name)) {
                a.Name = 'Unnamed account';
            }
        }
    }
}
\`\`\`

## Recursion and how to stop it

Recursion happens when a trigger updates records of the kind it listens to, so the same trigger fires again inside the same transaction. A common shape is an after update trigger that recalculates a parent, while another trigger on the parent recalculates its children, ping-ponging until a limit intervenes. The simplest guard is a private static Boolean on the handler: static state lives for one transaction only, so setting a flag on the first pass and returning early on later passes contains the loop. Better still, guard on the data itself: only update the related record when the field that drives the calculation actually changed between Trigger.oldMap and Trigger.new. Use the static flag as a last resort, because it can hide bugs that only appear in bulk.

## Bulkification

A trigger fires once per DML statement, not once per record, so the same code path must handle a batch of up to 200 records. Code that works for one record but issues a query or a DML statement per record in a loop is the classic Apex bug: 200 contacts can burn 200 of the 100 allowed SOQL queries and hit a LimitException before a single record is saved. The discipline is to separate reading from writing. First loop through Trigger.new and collect the ids you need into a Set, then run a single query with that Set bound in the WHERE clause, then build a Map so each record can find its related data in memory, and only then loop once more to apply the changes. Save your DML for one statement outside the loop over the whole list.

\`\`\`apex
public static void beforeInsert(List<Contact> records) {
    Set<Id> accountIds = new Set<Id>();
    for (Contact c : records) {
        if (c.AccountId != null) {
            accountIds.add(c.AccountId);
        }
    }

    Map<Id, Account> parents = new Map<Id, Account>(
        [SELECT Id, BillingCountry FROM Account WHERE Id IN :accountIds]
    );

    for (Contact c : records) {
        Account parent = parents.get(c.AccountId);
        if (parent != null) {
            c.MailingCountry = parent.BillingCountry;
        }
    }
}
\`\`\`

The numbers worth memorising: 100 SOQL queries, 150 DML statements, 10,000 rows touched by DML, about 10 seconds of CPU time and 6 MB of heap per synchronous transaction.

## Key takeaways

- Keep triggers thin and delegate to a handler class with one static method per event.
- Recursion is a trigger re-entering itself in one transaction; stop it with a static flag or, better, by checking that the driving value changed.
- Bulkify by collecting ids into a Set, running one query, building a Map and applying changes in a second loop.
- Never place a SOQL query or a DML statement inside a for loop that runs over trigger records.
- Know the core budgets: 100 SOQL queries, 150 DML statements, 10,000 DML rows, CPU and heap.`,
    },
    {
      slug: "apex-test-classes",
      title: "Apex Test Classes",
      summary:
        "Test classes prove your Apex works and unlock deployment. Learn @isTest, test data, start and stopTest, assertions and exception testing.",
      contentType: "code",
      isRequired: true,
      content: `## Why tests come first

Salesforce requires that at least 75 percent of your Apex code is covered by tests before you can deploy to production, and running the tests is part of the deployment itself. Coverage is the floor, not the goal: a test that merely executes a line proves nothing. A useful test asserts the outcome you actually care about, so a future refactor that breaks the behaviour fails the build instead of shipping. Tests also document your code, because a well-named test method states the rule in plain language.

Test classes are annotated with @isTest, which keeps them out of normal org limits and marks their purpose. Data created inside a test is rolled back when the test finishes, and tests cannot see your real org data unless you opt in with SeeAllData=true, a setting you should avoid because your assertions then depend on records you do not control.

\`\`\`apex
@isTest
private class AccountServiceTest {
    @isTest
    static void givesBlankAccountsAName() {
        Test.startTest();
        AccountService.applyDefaults(new List<Account>{ new Account() });
        Test.stopTest();

        Account saved = [SELECT Name FROM Account LIMIT 1];
        System.assertEquals('Unnamed account', saved.Name);
    }
}
\`\`\`

## startTest, stopTest and fixed search results

Test.startTest and Test.stopTest bracket the code under test and reset the governor limit counters, so the limits measured for your code are only the ones consumed between the two calls. stopTest also runs any asynchronous work that was queued inside the bracket immediately and synchronously, which is how a test can assert the result of a future or batch job without sleeping. The pair is the standard way to keep a test focused and deterministic, and it keeps a large test class from hitting limits that belong to earlier tests rather than the code under test.

For code that searches, Test.setFixedSearchResults takes a list of record ids and forces any SOSL search in the test to return exactly those, so the test does not depend on which records happen to exist.

## Assertions and coverage of paths

System.assert checks a condition and a message, while assertEquals and assertNotEquals compare values with a message that appears in the failure output. Always pass a message, because a bare false in a failure log tells you nothing. Write tests for the positive path, the edge cases such as empty lists and null fields, and the negative paths where the code should reject input. Testing that an exception is thrown means wrapping the call in try, calling System.assert(false) so the test fails if nothing was thrown, and catching the specific type to assert on the message.

\`\`\`apex
@isTest
static void rejectsBlankNames() {
    Test.startTest();
    try {
        AccountService.create('');
        System.assert(false, 'Expected an IllegalArgumentException');
    } catch (IllegalArgumentException e) {
        System.assert(e.getMessage().contains('blank'));
    }
    Test.stopTest();
}
\`\`\`

Finally, always include a bulk test that inserts or updates 200 records in one statement. It is the cheapest way to catch a trigger that quietly loops a query and would explode in production, and it proves the trigger works under the same conditions your users will create on their busiest day.

## Key takeaways

- @isTest marks test classes and methods, and tests roll back their own data instead of seeing org data.
- Deployment to production requires at least 75 percent org-wide Apex coverage, but meaningful assertions matter more than the number.
- Test.startTest and Test.stopTest reset the measured limits and run queued async work immediately.
- Assert with messages, cover positive, edge and negative paths, and expect exceptions with try and catch.
- Add a bulk test with 200 records so trigger code is proven before it meets real data.`,
    },
    {
      slug: "governor-limits",
      title: "Governor Limits and Transaction Execution",
      summary:
        "Every Apex transaction runs on a fixed budget. Learn the order of execution, the limit categories and how to measure your usage in code.",
      contentType: "code",
      isRequired: true,
      content: `## The order of execution

A trigger does not run in isolation; it sits in a fixed sequence that the platform performs every time records are saved. A simplified version of the sequence is: the transaction starts and the records are loaded, system validation checks field types and required fields, before triggers run, validation rules and duplicate checks run, sharing and record access checks run and the record is locked, after triggers run, then assignment rules, workflow rules, processes and flows run, and finally the transaction commits and post-commit work such as email delivery happens. Knowing the order answers classic interview questions, for example why a before trigger can set a field that a validation rule then checks, and why an after trigger sees ids that a before trigger never has.

## Categories of limits

Salesforce enforces budgets in several areas. Data access limits cap how much you can read and write: 100 SOQL queries, 20 SOSL searches, 150 DML statements, 10,000 rows touched by DML and 50,000 rows returned by SOQL in one transaction. Execution resource limits cap how hard you can compute: roughly 10 seconds of CPU time and 6 MB of heap for synchronous code, with larger budgets for asynchronous transactions. Integration limits allow 100 callouts per transaction, and asynchronous limits restrict how many future invocations and chained jobs one transaction may start.

Exceeding any of these throws a LimitException that aborts the transaction and cannot be caught, so the strategy is always to stay well inside the budget rather than to react when it runs out.

## Measuring usage in code

The System.Limits class exposes the current usage and the maximum, which turns guesswork into numbers while you build and debug.

\`\`\`apex
public static void reportUsage() {
    Integer used = Limits.getQueries();
    Integer allowed = Limits.getLimitQueries();
    System.debug('SOQL used ' + used + ' of ' + allowed);

    Integer dmlUsed = Limits.getDmlStatements();
    System.debug('DML statements used: ' + dmlUsed);
}
\`\`\`

The same pattern works for rows, callouts, CPU time and heap, and the values are handy in tests too, where a test can assert that a bulk operation stayed under a chosen number of queries.

## Designing for limits

The limits are easy to respect when you build with the habits from earlier lessons. Batch your reads with Sets and Maps so one statement replaces two hundred. Keep loops over records free of queries and DML. Prefer aggregate queries that return counts to queries that load thousands of rows you only count. Move heavy work to asynchronous Apex, which runs with a larger budget and outside the user's request. Watch CPU time in code that parses strings or nests loops, and remember recursion guards keep a single transaction from repeating expensive work.

## Key takeaways

- Every save follows a fixed order: load, system validation, before triggers, validation rules, access checks, after triggers, then automation and commit.
- Limits fall into data access, execution resources, integration and asynchronous categories, each with its own budget.
- LimitException aborts the transaction and cannot be caught, so design for margin instead.
- System.Limits reports current usage and maximums, which makes bulk efficiency measurable.
- Efficient reads through Sets and Maps, loop hygiene and asynchronous work keep transactions inside their budgets.`,
    },
    {
      slug: "asynchronous-apex",
      title: "Asynchronous Apex: Future, Queueable and Batch",
      summary:
        "Move heavy or long-running work out of the user's request with future methods, Queueable jobs, Batch Apex and Scheduled Apex.",
      contentType: "code",
      isRequired: true,
      content: `## Why go asynchronous

Synchronous Apex shares the request with the user and the transaction's small budget. Asynchronous Apex runs later in its own transaction with a larger budget, and the original request finishes without waiting. Reach for it in three situations: the work makes callouts that would otherwise slow the response, the volume of records exceeds what one synchronous transaction can process, or the work must happen on a schedule rather than in response to an event. The trade-off is that the user sees the result after the fact, so asynchronous code must be idempotent and cannot rely on being inside a trigger context.

## Future methods

A future method is a static method annotated with @future. You call it like any method, but the platform queues it and runs it after the current transaction commits. The constraints shape how you design it: parameters must be primitives or collections of primitives, so sObjects cannot be passed and you pass ids and strings instead, and the future method must query its own data. Declare @future(callout=true) if the method performs callouts, and note that a transaction making a callout through a future is limited to a single callout, so complex integrations belong in Queueable or Batch.

\`\`\`apex
public class ExternalService {
    @future(callout=true)
    public static void notify(String accountId, String status) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:ExternalApi/accounts/' + accountId);
        req.setMethod('POST');
        req.setBody('{"status":"' + status + '"}');
        new Http().send(req);
    }
}
\`\`\`

## Queueable Apex

A Queueable class implements the Queueable interface with a single execute method that receives a context parameter. Unlike a future method it accepts sObject parameters, so you can hand it records directly, and it can perform callouts when the class also declares Database.AllowsCallouts. Its signature feature is chaining: inside execute you may call System.enqueueJob with another Queueable to continue the work in a fresh transaction, which is how you process an unbounded amount of work in bounded steps. Chaining is depth limited, so a job may enqueue only one successor and the chain can only run a handful of levels deep.

\`\`\`apex
public class CleanupJob implements Queueable {
    public void execute(QueueableContext ctx) {
        List<Account> stale = [
            SELECT Id FROM Account WHERE LastActivityDate < LAST_N_DAYS:365
        ];
        delete stale;
        System.enqueueJob(new FollowUpJob());
    }
}
\`\`\`

## Batch Apex and Scheduled Apex

Batch Apex splits a large job into chunks. You implement Database.Batchable, whose start method returns a QueryLocator over the whole data set, whose execute method processes one chunk, and whose finish method runs once at the end. You launch it with Database.executeBatch, optionally passing a scope size that controls how many records each execute receives, with 200 as the default. Add Database.Stateful when member variables must survive between execute calls, such as a counter for a summary in finish.

Scheduled Apex implements Schedulable, whose execute method runs on a cron expression you register with System.schedule, and the usual job is to kick off a batch.

\`\`\`apex
public class StaleAccountBatch implements Database.Batchable<sObject> {
    public Database.QueryLocator start(Database.BatchableContext ctx) {
        return Database.getQueryLocator('SELECT Id FROM Account WHERE Inactive__c = true');
    }
    public void execute(Database.BatchableContext ctx, List<Account> scope) {
        delete scope;
    }
    public void finish(Database.BatchableContext ctx) {
        System.debug('Stale accounts removed');
    }
}

public class NightlyCleanup implements Schedulable {
    public void execute(SchedulableContext ctx) {
        Database.executeBatch(new StaleAccountBatch(), 200);
    }
}
\`\`\`

In short: future for small primitive-only jobs, Queueable for payloads and chained steps, Batch for large data volumes, and Scheduled for anything that must happen on the clock.

## Key takeaways

- Asynchronous Apex runs in its own transaction with a bigger budget, after the user's request finishes.
- Future methods take only primitive parameters, and callouts require the @future(callout=true) flag.
- Queueable accepts sObjects, can make callouts with Database.AllowsCallouts, and can chain one successor job.
- Batch Apex processes records in scopes through start, execute and finish, with Database.Stateful for counters.
- Scheduled Apex implements Schedulable and is registered with System.schedule using a cron expression.`,
    },
  ],
  quiz: {
    title: "Unit 4 Quiz: Apex Programming Development",
    description:
      "Check your understanding of triggers, context variables, bulkification, test classes, governor limits and asynchronous Apex.",
    passingPercentage: 70,
    maxAttempts: 3,
    questions: [
      {
        questionText: "Which statement about Trigger.old is true?",
        questionType: "multiple_choice",
        explanation:
          "Trigger.old holds the previous versions of records and is always read-only. It exists in update and delete triggers, never in insert triggers, because before an insert there is no previous version.",
        options: [
          {
            text: "It is read-only and is available in update and delete triggers",
            correct: true,
          },
          {
            text: "It contains the records as they exist after the trigger finishes",
            correct: false,
          },
          {
            text: "It is available in insert triggers for comparing defaults",
            correct: false,
          },
          {
            text: "It can be modified in before triggers to block changes",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "A trigger contains this code:\n\n```\nfor (Contact c : Trigger.new) {\n    List<Account> a = [SELECT Id FROM Account WHERE Id = :c.AccountId];\n    update a;\n}\n```\n\nWhat is the main problem?",
        questionType: "multiple_choice",
        explanation:
          "The query and the DML statement run once per record, so 200 contacts consume 200 SOQL queries and 200 DML statements, far past the limits of 100 and 150. Collect the ids into a Set and run one query outside the loop instead.",
        options: [
          {
            text: "It issues a SOQL query and a DML statement per record, which exhausts governor limits in bulk",
            correct: true,
          },
          {
            text: "Trigger.new cannot be read in an after trigger",
            correct: false,
          },
          {
            text: "DML statements are not allowed inside a for loop",
            correct: false,
          },
          {
            text: "The trigger must declare before insert for the update to work",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "An after update trigger on Account recalculates parent totals, and the recalculation updates accounts, firing the trigger again. What is the simplest guard?",
        questionType: "multiple_choice",
        explanation:
          "A private static Boolean lives for one transaction only, so setting it on the first pass and returning early on later passes stops the loop. Checking that the driving value actually changed is even better.",
        options: [
          {
            text: "A static Boolean flag on the handler that is checked and set on entry",
            correct: true,
          },
          {
            text: "Deleting the records before the recalculation runs",
            correct: false,
          },
          {
            text: "Calling System.debug to trace how many times the trigger runs",
            correct: false,
          },
          {
            text: "Adding the trigger to a second time to share the work",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "What do Test.startTest and Test.stopTest provide in a test method?",
        questionType: "multiple_choice",
        explanation:
          "The pair resets the measured governor limits to the code between the calls, and stopTest runs any asynchronous jobs queued inside the bracket immediately so the test can assert their results.",
        options: [
          {
            text: "They reset the measured limits and run queued async jobs at the stopTest point",
            correct: true,
          },
          {
            text: "They delete all test data so the org stays clean",
            correct: false,
          },
          {
            text: "They commit test data so other tests can reuse it",
            correct: false,
          },
          {
            text: "They automatically raise code coverage to 75 percent",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "A test runs `Database.executeBatch(new StaleAccountBatch(), 50);`. What does the 50 mean?",
        questionType: "multiple_choice",
        explanation:
          "The second argument is the scope size, so each execute call receives up to 50 records. The default scope is 200, and start still returns the full data set.",
        options: [
          {
            text: "The execute method receives batches of up to 50 records",
            correct: true,
          },
          {
            text: "Only the first 50 records of the query are ever processed",
            correct: false,
          },
          {
            text: "The batch may run no more than 50 times",
            correct: false,
          },
          {
            text: "The job uses 50 of the org's 100 allowed SOQL queries",
            correct: false,
          },
        ],
      },
      {
        questionText: "Which statements about asynchronous Apex are true?",
        questionType: "multiple_select",
        explanation:
          "Future methods accept only primitive parameters, Queueable jobs can be chained with System.enqueueJob, and Batch Apex processes records in scopes. Scheduled Apex implements the Schedulable interface, not Queueable.",
        options: [
          {
            text: "A @future method can only accept primitive parameters",
            correct: true,
          },
          {
            text: "A Queueable job can enqueue another Queueable job to continue the work",
            correct: true,
          },
          {
            text: "Batch Apex passes a scope of records to each execute call",
            correct: true,
          },
          {
            text: "Scheduled Apex must implement the Queueable interface",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "A trigger fires once for a DML statement, and all records in that statement are processed in a single transaction whether the statement contained one record or 200.",
        questionType: "true_false",
        explanation:
          "This is the foundation of bulkification: one trigger invocation sees the whole batch through Trigger.new, so the code must work for any number of records within the same set of governor limits.",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
    ],
  },
};

export default unit4;

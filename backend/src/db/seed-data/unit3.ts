import type { UnitSeed } from "./types";

const unit3: UnitSeed = {
  slug: "apex-programming-basics",
  title: "Apex Programming Basics",
  description:
    "Learn the fundamentals of Apex: what the language is, variables and data types, control flow, collections, SOQL queries and DML, plus transactions and exception handling.",
  lessons: [
    {
      slug: "what-is-apex",
      title: "What Is Apex and When to Use It",
      summary:
        "Apex is Salesforce's strongly typed, Java-like language that runs on the platform. Learn how it executes and when clicks are a better choice.",
      contentType: "code",
      isRequired: true,
      content: `## A language built for the platform

Apex is a strongly typed, object-oriented language with syntax that will feel familiar if you have written Java or C#. It is not a general purpose language: Apex code is stored as metadata inside your Salesforce org, compiled on the platform, and executed on Salesforce servers next to your data. Because the runtime is strongly typed, the compiler catches whole categories of mistakes before anything runs. A method that declares an Integer parameter will not accept a String, assigning a Double to an Integer variable fails to compile, and a field that does not exist on an sObject breaks the build instead of failing quietly in production.

Apex is designed around the sObject model. Account, Contact and every custom object are real Apex types with typed fields, so there is no database driver, no connection string and no separate data access layer to learn. You declare an Account variable, set its fields and save it, and the platform handles the rest.

\`\`\`apex
public class RevenueFormatter {
    public static String describe(Account acct) {
        if (acct.AnnualRevenue == null) {
            return acct.Name + ': no revenue recorded';
        }
        return acct.Name + ': ' + acct.AnnualRevenue.format();
    }
}
\`\`\`

## One transaction at a time

Every piece of Apex runs inside a transaction. The transaction starts, statements execute against the data, and at the end everything either commits or rolls back as a unit. Synchronous Apex runs inside the same request that triggered it, such as a button click, a trigger or an inbound REST call, so the user waits for it to finish. Asynchronous Apex, including future methods, Queueable jobs, Batch Apex and scheduled jobs, runs later in its own separate transaction with its own set of resources.

Salesforce hosts many customers on shared infrastructure, so every transaction is capped by governor limits: a fixed budget of SOQL queries, DML statements, records touched, CPU time and memory. These limits are the reason some Apex habits that look harmless, like querying inside a loop, are serious bugs. You will meet the numbers in Unit 4.

## When not to write Apex

The best Apex is the Apex you never write. Salesforce administrators can solve a large share of requirements declaratively with objects, validation rules, formula fields, flows, approval processes and sharing rules. Declarative solutions are cheaper to maintain because an admin can change them without writing tests or shipping a deployment, and they cannot break compilation.

Reach for Apex when the logic genuinely exceeds declarative reach: deeply branching rules a flow would render unreadable, custom integration logic, calculations across large data sets, or behaviour shared by triggers, batch jobs and APIs. A practical rule of thumb: if a business analyst can build and later change the requirement in an hour with a flow, keep it in the flow. Also remember Apex is reactive. It runs only in response to an event, so anything that must happen on a calendar needs Scheduled Apex, and anything long running needs an asynchronous design.

## Key takeaways

- Apex is a strongly typed, Java-like language stored as metadata and executed on Salesforce servers.
- sObjects are native Apex types, so record access needs no external data layer.
- Synchronous code runs inside the triggering request; asynchronous code runs later in its own transaction and limits.
- Every transaction is bounded by governor limits, which shape how Apex code must be written.
- Prefer clicks, formulas and Flow first, and add Apex only when the requirement truly exceeds them.`,
    },
    {
      slug: "variables-and-data-types",
      title: "Variables, Data Types and Control Flow",
      summary:
        "Declare classes, methods and variables with Apex primitives and sObject types, then branch and loop with if, for, while and do-while.",
      contentType: "code",
      isRequired: true,
      content: `## Classes and methods

Every piece of Apex lives inside a class, and classes contain methods. A method declares a return type, a name and a parameter list. The keyword void means the method returns nothing. Static methods belong to the class itself, so you call them without creating an instance, and System.debug prints values to the debug log, which is your main tool while learning.

\`\`\`apex
public class TaxCalculator {
    public static Decimal total(Decimal net, Decimal rate) {
        return net + (net * rate);
    }
}

System.debug(TaxCalculator.total(100, 0.2));
\`\`\`

## Types: primitives and sObjects

Apex has the primitives you would expect. Integer holds whole numbers, Double holds decimal numbers, Boolean holds true or false, String holds text, and Date, Datetime and Time hold calendar values. Long holds very large whole numbers, Decimal is the fixed-scale numeric type used for currency, Id represents a 15 or 18 character record identifier, and Object can hold any type at runtime.

Two habits matter here. First, Apex does not narrow numbers silently: assigning 3.5 to an Integer variable is a compile error, and you must convert deliberately. Second, an uninitialized variable is null rather than zero or false, so defensive null checks are part of everyday Apex, especially on fields a user may never have filled in.

An sObject variable behaves like a typed record. You create one with new, assign fields by name, and the compiler checks that the fields exist on that object. The field types line up with what you already know from the schema: text fields are String, number fields are Integer or Decimal, checkboxes are Boolean, dates use Date, and lookup relationships use Id. When code must be dynamic, such as working with fields chosen at runtime, sObject also offers generic get and put methods that take the field name as a String, at the cost of compile time checking.

\`\`\`apex
Integer count;                       // null until it is assigned
Boolean missing = (count == null);   // true
String a = 'Acme';
String b = 'Acme';
Boolean same = (a == b);             // true - Apex compares String values with ==

Account acct = new Account();
acct.Name = 'Acme Corporation';
acct.Industry = 'Technology';
acct.NumberOfEmployees = 120;
Id key = acct.Id;                    // null until the record is saved
\`\`\`

## Control flow

Apex has the control flow structures from any mainstream language. if, else if and else branch on conditions. The for statement works both as a counted loop and as a for-each loop over collections. while checks its condition before each pass, while do-while checks after, which guarantees the body runs at least once. break leaves the innermost loop and continue skips to the next pass.

\`\`\`apex
Integer passes = 0;
List<Integer> scores = new List<Integer>{ 55, 82, 91 };

for (Integer i = 0; i < scores.size(); i++) {
    if (scores[i] >= 70) {
        passes++;
    }
}

while (passes > 2) {
    passes--;
}

do {
    passes++;
} while (passes > 100);   // body still runs once
\`\`\`

## String methods

Text processing is constant work in Apex, and String ships with the tools you need: length, isEmpty, contains, startsWith, toLowerCase, toUpperCase, trim, substring, split, equalsIgnoreCase and many more. Chaining reads left to right, so a typical clean up is one expression such as fullName.trim().capitalize() that turns raw input into a tidy value. Strings are immutable, so every method returns a new String rather than changing the original, which means you must keep the result instead of expecting the variable to change in place.

One sharp edge to remember: calling an instance method on a null String throws a NullPointerException, which is why handling code checks for null before calling length or contains. The static form String.isEmpty(someValue) treats null as empty and is safe to call directly, and String.isBlank adds a whitespace-only check that is perfect for user input that may contain nothing but spaces.

## Key takeaways

- Apex code lives in classes; static methods are called on the class and return a typed value or void.
- Primitives include Integer, Double, Boolean, String, Date, Datetime, Id and Object, and Apex will not narrow numbers implicitly.
- Uninitialized variables are null, so null checks on optional fields are normal practice.
- sObject variables are compile-time checked against the object schema, with generic get and put available for dynamic code.
- Use if and else for branching, for or for-each for iteration, while to pre-test, and do-while when the body must run once.`,
    },
    {
      slug: "collections-lists-sets-maps",
      title: "Lists, Sets and Maps",
      summary:
        "Group data with the three core Apex collections, and learn how to add, read, sort, deduplicate and iterate each of them.",
      contentType: "code",
      isRequired: true,
      content: `## Lists: ordered and indexed

A List is an ordered collection that keeps duplicates and lets you access elements by index. You declare the element type, so a List<String> will not accept an Account. The workhorse methods are add to append, get and set to read and replace by index, size for the count, isEmpty for the common guard check, and remove to delete by index.

sort() reorders the list in place, but only when the elements can be compared with each other. Sorting a list of primitives such as String, Integer, Date or Datetime works out of the box. Sorting a list of your own class throws a runtime error unless that class implements the Comparable interface, so plan ahead if you want custom ordering.

\`\`\`apex
List<String> names = new List<String>{ 'Chen', 'Adams', 'Baker' };
names.add('Diaz');

String first = names.get(0);    // 'Chen'
names.set(0, 'Chen, Ada');      // replace index 0
Boolean none = names.isEmpty(); // false

names.sort();                   // ascending order
System.debug(names.get(0));     // 'Adams'
\`\`\`

## Sets: uniqueness without duplicates

A Set stores unique values and has no particular order, no indexes and no get by position. add returns true when the value was new and false when it was already present, which makes Sets the natural tool for de-duplicating ids collected from records. contains is fast, which matters when you need to check membership while looping. Sets are declared with a type as well, and Set<Id> is one of the most common declarations in real Apex.

\`\`\`apex
Set<String> tags = new Set<String>();

Boolean added = tags.add('Urgent');   // true
tags.add('Urgent');                   // false, duplicate ignored
tags.add('Vip');

System.debug(tags.size());            // 2
tags.remove('Vip');
System.debug(tags.contains('Urgent')); // true
\`\`\`

## Maps: key-value lookup

A Map stores pairs of keys and values and is the fastest way to look something up by an identifier. put adds or replaces an entry, get returns the value, containsKey asks whether a key exists, keySet returns the keys as a Set, and values returns the collection of values. The detail that saves beginners from bugs: get on a key that is missing returns null rather than throwing an error, so check containsKey when null is ambiguous, or accept null as a valid answer.

\`\`\`apex
Map<String, Integer> openCounts = new Map<String, Integer>();
openCounts.put('New', 12);
openCounts.put('Working', 4);

Integer n = openCounts.get('New');          // 12
Boolean known = openCounts.containsKey('Won'); // false
System.debug(n + ' of ' + openCounts.size());

for (String stage : openCounts.keySet()) {
    System.debug(stage + ': ' + openCounts.get(stage));
}
\`\`\`

## Iterating and choosing the right collection

for-each loops are the default way to walk a List or a Set, and they keep the loop body free of index bookkeeping. For a Map, loop over keySet and call get for each key, as above, because you cannot iterate a map directly. When the map you want is built from query results, remember that the Map constructor accepts a List, so a query can be wrapped in a single expression and keyed by Id: \`Map<Id, Account> byId = new Map<Id, Account>([SELECT Id, Name FROM Account]);\`. From that point every lookup is an in-memory get rather than another query, which is exactly how trigger code stays inside its limits.

Choose the collection by the job it does. Use a List when order matters or duplicates are legitimate, such as the rows you are about to insert. Use a Set when you need uniqueness or fast contains checks, such as the account ids collected from a batch of contacts. Use a Map when you repeatedly look records up by a key, such as matching each contact to its parent account. Mixing them is normal: collect ids in a Set, query once, wrap the result in a Map, then loop the records and apply the changes.

## Key takeaways

- Lists keep order and duplicates, and are read and written by index with get and set.
- sort() only works when elements are comparable primitives, or classes that implement Comparable.
- Sets guarantee uniqueness and give fast contains checks, making them ideal for collecting ids.
- Maps provide key-value lookup; get returns null for a missing key instead of raising an error.
- Loop Lists and Sets with for-each, and loop Maps through keySet before calling get.`,
    },
    {
      slug: "soql-and-relationship-queries",
      title: "SOQL and Relationship Queries",
      summary:
        "Query records with SOQL inside Apex: filters, ordering, aggregates, bind variables, relationship traversal and semi-joins.",
      contentType: "code",
      isRequired: true,
      content: `## Reading records with SOQL

SOQL, the Salesforce Object Query Language, is how Apex reads data. A query names the fields it needs rather than using SELECT star, names one object in FROM, and filters with WHERE. In Apex you place the query in square brackets and it returns a List of the object you selected, so most queries should be assigned to a List even when you expect one row.

If you assign a query result to a single sObject variable and no rows come back, Apex throws a QueryException. The safe pattern for a single record is to query a list with LIMIT 1 and then check isEmpty before reading element zero.

\`\`\`apex
String term = 'Acme';
String namePattern = '%' + term + '%';

List<Account> matches = [
    SELECT Id, Name, AnnualRevenue
    FROM Account
    WHERE Name LIKE :namePattern
      AND AnnualRevenue > 100000
    ORDER BY Name ASC
    LIMIT 20
];
\`\`\`

## Filtering with WHERE

WHERE supports the comparison operators you would expect, including equals, not equals, greater than and less than, combined with AND, OR and NOT and grouped with parentheses. LIKE does pattern matching, where percent matches any run of characters and underscore matches a single character. IN tests membership in an explicit list or in a Set, and BETWEEN works for numbers and dates.

Bind variables are one of Apex's best features. A colon before a variable name, as in :namePattern, lets SOQL read a local variable, a parameter or a member variable directly. Use bind variables instead of concatenating text into the query string, because concatenation invites SOQL injection bugs and forces you to escape quotes by hand.

## Sorting, grouping and paging

ORDER BY sorts results, supports ascending and descending direction, and can place nulls first or last. Aggregate functions turn rows into summaries: COUNT, SUM, MIN, MAX and AVG. When a query uses GROUP BY, each output row represents a group and the result is a list of AggregateResult objects, which are generic: you read values with get, which returns Object, so cast them. HAVING filters groups the same way WHERE filters rows, and LIMIT together with OFFSET gives you simple pagination, with OFFSET capped at 2000.

\`\`\`apex
List<AggregateResult> grouped = [
    SELECT Industry ind, COUNT(Id) total
    FROM Account
    WHERE Industry != null
    GROUP BY Industry
    HAVING COUNT(Id) > 3
    ORDER BY COUNT(Id) DESC
    LIMIT 10
];

AggregateResult row = grouped[0];
String industry = (String) row.get('ind');
Integer count = (Integer) row.get('total');
\`\`\`

## Relationship queries

You do not need a second query to reach a parent record. Dot notation traverses upward, as in SELECT Account.Name FROM Contact, and you can keep going up the chain. To reach children, put a subquery in square brackets, which returns the related records nested inside each parent row. The platform allows up to five levels of parent traversal, and a query that includes child subqueries returns at most 2,000 rows, so very large data sets belong in Batch Apex rather than one enormous query.

Semi-joins and anti-joins express set membership with a subquery. An IN subquery selects parents that have matching children, and NOT IN selects parents that do not. Salesforce restricts which fields may appear inside a semi-join subquery, so verify unusual cases against the documentation.

\`\`\`apex
List<Account> usAccounts = [
    SELECT Id, Name, (SELECT Id, Name FROM Contacts)
    FROM Account
    WHERE Id IN (SELECT AccountId FROM Contact WHERE MailingCountry = 'US')
];

Set<Id> exclude = new Set<Id>{ someId };
List<Account> others = [SELECT Id FROM Account WHERE Id NOT IN :exclude];
\`\`\`

## Key takeaways

- SOQL in Apex returns a List, and assigning a single-row query with no results throws a QueryException.
- LIKE, IN and BETWEEN extend WHERE filters, and bind variables keep queries safe from injection.
- GROUP BY produces AggregateResult rows that must be read with get and cast.
- Dot notation walks up to parents, bracketed subqueries walk down to children, within five levels and 2,000 rows.
- Semi-joins and anti-joins filter parents by whether matching children exist, without a second query.`,
    },
    {
      slug: "dml-operations",
      title: "DML: Insert, Update, Delete, Undelete and Upsert",
      summary:
        "Change records from Apex with the DML statements, and compare them with Database methods for partial success handling.",
      contentType: "code",
      isRequired: true,
      content: `## The five DML statements

DML, data manipulation language, changes records. Apex has five DML statements. insert creates new records. update saves changes to records that already have an Id. delete moves records to the recycle bin. undelete restores them. upsert does both insert and update in one statement: a record with an Id is matched and updated, a record without one is inserted, and you can name an external ID field so upsert matches your data against an integration key instead of an internal Id.

Every DML statement accepts either a single sObject or a list of sObjects. Always prefer the list form, even for one record, because trigger and bulk context code expects it.

\`\`\`apex
Account acct = new Account(Name = 'Northwind');
insert acct;

acct.Website = 'https://northwind.example';
update acct;

Account copy = new Account(Name = 'Northwind legacy');
insert copy;
delete copy;
undelete copy;
\`\`\`

Upsert deserves a second look because it removes a common integration bug. Without a named field, upsert matches on Id, which suits data you have already fetched. When you name an external ID field instead, the platform matches on your business key, so re-running an import updates the same rows rather than creating duplicates every time. Undelete is equally useful in managed packages: it restores recycled records and fires undelete triggers, which is exactly the behaviour a restore feature should have.

## DML statements versus Database methods

The DML statements are all-or-nothing. If any record in the statement fails validation, the statement throws a DmlException and nothing from that statement is saved. That is usually what you want for a single logical change.

The Database methods, such as Database.insert and Database.update, take a second parameter called allOrNothing. Passing true behaves like the DML statements. Passing false gives you partial success: valid rows are saved, invalid rows are skipped, and you get back a list of SaveResult objects, one per row, that you can inspect. Each SaveResult offers isSuccess, getId for the saved record, and getErrors, which returns platform errors including messages and the offending field names.

\`\`\`apex
List<Account> batch = new List<Account>{
    new Account(Name = 'Alpha'),
    new Account(Name = '')   // Name is required, so this row fails
};

List<Database.SaveResult> results = Database.insert(batch, false);

for (Database.SaveResult r : results) {
    if (r.isSuccess()) {
        System.debug('Inserted ' + r.getId());
    } else {
        for (Database.Error err : r.getErrors()) {
            System.debug('Failed: ' + err.getMessage());
        }
    }
}
\`\`\`

## Handling partial success

Partial success suits imports, integrations and anywhere one bad row should not poison the batch. A typical pattern is to save what you can, collect the failed rows with their messages, and report the failures to the user or a log object. You can even retry failed rows after fixing them in memory, since the failed ones were simply not saved.

Two cautions. Partial success only relaxes the DML statement itself: an unhandled exception later in the same transaction still rolls everything back. And performing DML on an empty list is an error, not a no-op. Inserting, updating or deleting an empty list throws a DmlException at runtime, so guard bulk code with an isEmpty check before the DML line.

## Key takeaways

- insert, update, delete, undelete and upsert are the five Apex DML statements, and upsert matches on Id or an external ID field.
- DML statements are all-or-nothing and raise a DmlException when any row fails.
- Database methods with allOrNothing set to false return SaveResult objects and allow partial success.
- Inspect SaveResult with isSuccess, getId and getErrors to report exactly which rows failed and why.
- DML on an empty list throws an exception, so guard it with isEmpty before running bulk operations.`,
    },
    {
      slug: "transactions-and-exceptions",
      title: "Transactions, Scope and Exception Handling",
      summary:
        "Understand the Apex transaction boundary, roll back with savepoints, and handle errors with try, catch, finally and custom exceptions.",
      contentType: "code",
      isRequired: true,
      content: `## The transaction boundary

An Apex transaction is the unit of work that commits or rolls back together. All DML performed inside the transaction is visible to other transactions only when the transaction completes successfully. If an exception escapes unhandled, the platform discards the changes and reports the error to whoever triggered the request.

Sometimes you need finer control than all-or-nothing, and savepoints provide it. Database.setSavepoint marks a position you can return to, and Database.rollback undoes the DML performed since that mark. Rolling back to the mark undoes every statement since it, not just the last one, which is how code keeps an all-or-nothing promise across several separate DML operations. Keep them few: a transaction may hold only a small fixed number of savepoints, and the typical pattern is one savepoint plus one rollback in a catch block.

\`\`\`apex
Savepoint sp = Database.setSavepoint();

try {
    insert new Account(Name = 'Acme');
    insert new Contact(LastName = '');   // LastName is required, this fails
} catch (DmlException e) {
    Database.rollback(sp);
    System.debug('Rolled back: ' + e.getMessage());
}
\`\`\`

## try, catch, finally and throwing

The try block holds code that might fail. The catch block handles a specific exception type, and you can write more than one catch to treat different failures differently. The finally block runs on the way out no matter what happened, which makes it a home for cleanup such as releasing a lock or writing a summary log line. Catching and rethrowing is also a normal pattern: log the rich details for administrators, then throw the same exception again so the caller and the end user still learn that the operation failed.

Apex also throws exceptions. You can throw the built-in types, and you can define your own by extending Exception. A custom exception lets calling code react precisely to a business rule violation instead of guessing from a message string.

\`\`\`apex
public class DiscountException extends Exception {}

public static Decimal applyDiscount(Decimal revenue, Decimal pct) {
    if (revenue < 0) {
        throw new DiscountException('Revenue must not be negative');
    }
    if (pct < 0 || pct > 100) {
        throw new DiscountException('Discount must be between 0 and 100');
    }
    return revenue * (1 - pct / 100);
}
\`\`\`

## The exception types you will meet

DmlException is raised when a DML statement fails, and it exposes the index of the failing row, the failing field names and the messages, which is exactly what you need to log good errors. QueryException is raised when a query fails at runtime, including the classic case of assigning a query with no results to a single sObject variable. NullPointerException appears when you dereference a null variable or call a method on a null String, and it is usually a sign that a null check belongs earlier in the method.

LimitException is the important one to understand. It is thrown when a transaction exceeds a governor limit such as the number of SOQL queries or the CPU time budget. You cannot catch it. The platform aborts the transaction from outside your code, because letting code swallow the error and keep running would let one transaction monopolise shared resources indefinitely. The only remedy is design: write bulk-safe code that stays comfortably inside the limits, which is the subject of the next unit.

## Key takeaways

- An Apex transaction commits or rolls back as one unit, and an unhandled exception rolls the changes back.
- Savepoints give fine-grained control: set a savepoint before risky work and roll back inside catch.
- try and catch handle failures by type, finally always runs, and custom exceptions extend Exception.
- DmlException and QueryException carry rich diagnostic information that you should log rather than swallow.
- LimitException cannot be caught, so the answer to governor limits is bulk-safe design, not defensive catch blocks.`,
    },
  ],
  quiz: {
    title: "Unit 3 Quiz: Apex Programming Basics",
    description:
      "Check your understanding of Apex data types, control flow, collections, SOQL, DML and exception handling.",
    passingPercentage: 70,
    maxAttempts: 3,
    questions: [
      {
        questionText:
          "What does this code print?\n\n```\nList<String> names = new List<String>{ 'Dana', 'Bob', 'Amy' };\nnames.sort();\nSystem.debug(names.get(0));\n```",
        questionType: "multiple_choice",
        explanation:
          "sort() reorders a list of comparable primitives in ascending natural order, so 'Amy' moves to index 0.",
        options: [
          { text: "Amy", correct: true },
          { text: "Bob", correct: false },
          { text: "Dana", correct: false },
          { text: "The order cannot be determined at compile time", correct: false },
        ],
      },
      {
        questionText: "Which of these is NOT an Apex primitive data type?",
        questionType: "multiple_choice",
        explanation:
          "Account is an sObject type built from the schema, while Integer, Double and Boolean are primitive types built into the language.",
        options: [
          { text: "Integer", correct: false },
          { text: "Double", correct: false },
          { text: "Account", correct: true },
          { text: "Boolean", correct: false },
        ],
      },
      {
        questionText:
          "A SOQL query can traverse at most five levels of parent relationship fields in a single query.",
        questionType: "true_false",
        explanation:
          "Salesforce allows up to five levels of parent traversal, and relationship queries that include child subqueries return at most 2,000 rows, so very large traversals belong in Batch Apex.",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      },
      {
        questionText:
          "Which query returns each account together with its related contacts in one round trip?",
        questionType: "multiple_choice",
        explanation:
          "Child records are fetched with a subquery in square brackets inside the parent query, which nests the contacts under each account row.",
        options: [
          {
            text: "SELECT Id, Name, (SELECT Id, Name FROM Contacts) FROM Account",
            correct: true,
          },
          {
            text: "SELECT Id, Name, Contacts FROM Account",
            correct: false,
          },
          {
            text: "SELECT Id FROM Account, Contacts",
            correct: false,
          },
          {
            text: "SELECT Account.Id, Contact.Id FROM Account JOIN Contacts",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "What is the behaviour of `Database.insert(records, false)` when one record in the list is invalid?",
        questionType: "multiple_choice",
        explanation:
          "Passing false for allOrNothing allows partial success: valid rows are saved and each row's SaveResult reports success or the errors that stopped it.",
        options: [
          {
            text: "Every row in the list is saved, so nothing is rejected",
            correct: false,
          },
          {
            text: "Valid rows are saved and the failed rows are reported through SaveResult objects",
            correct: true,
          },
          {
            text: "The whole transaction is rolled back and a QueryException is thrown",
            correct: false,
          },
          {
            text: "The invalid row is silently deleted from the list before saving",
            correct: false,
          },
        ],
      },
      {
        questionText: "Which statements about Apex collections are true?",
        questionType: "multiple_select",
        explanation:
          "Sets discard duplicates, Map.get returns null for a missing key rather than throwing, and List.size reports the element count. Sets do not keep insertion order, so iteration order is not guaranteed.",
        options: [
          { text: "A Set ignores duplicate values when you add them", correct: true },
          {
            text: "Map.get(key) returns null when the key is not in the map",
            correct: true,
          },
          { text: "List.size() returns the number of elements in the list", correct: true },
          {
            text: "Sets iterate in the order values were inserted",
            correct: false,
          },
        ],
      },
      {
        questionText:
          "Why can Apex code never catch a LimitException when it exceeds a governor limit?",
        questionType: "multiple_choice",
        explanation:
          "The platform terminates the transaction when a governor limit is exceeded, so the code never gets the chance to handle it. Staying within the limits through bulk-safe design is the only remedy.",
        options: [
          {
            text: "The platform aborts the whole transaction, so execution never reaches your catch block",
            correct: true,
          },
          {
            text: "LimitException is only thrown in test classes, so it needs no handling",
            correct: false,
          },
          {
            text: "It must be caught as a DmlException instead",
            correct: false,
          },
          {
            text: "Because the exception is declared with no message",
            correct: false,
          },
        ],
      },
    ],
  },
};

export default unit3;

Data Thing, by The APS Group
==========

Available, for your convenience, at <http://theapsgroup.github.io/Data-Thing/>

General purpose json fiddle tool. I found myself writing many small nodejs scripts just to transform data in another format. The overhead of reading and saving files is removed, furthermore a real-time feedback mechanism (better than console and nodemon) is added.

1. Load a json file by opening or dragging in.
2. Create a script by opening or creating from scratch. `Q` and `TreeLib` are available as globals, more (or a more generic way to inject dependencies) may follow.
3. Use the "magic" variable `input` and return a new output. Most simple script is `return input`
4. Save the result.

Working with text or xml
-------------

By setting the input mode to text, the input is interpreted as an array of strings, which can be used by JavaScript transformation scripts.

By setting the input mode to xml, the input is interpreted as jsonml, which is a JSON serialization of xml. This can be used by JavaScript or XSL transformation scripts.

By setting the output mode to text, the output MUST be an array of strings.

By setting the output mode to xml, the output MUST be valid jsonml, which is automatically produced by a correct xsl transformation

Linking gists
-----------

By creating a gist with at least one of the following files:

- input.js
- input.txt
- input.xml
- script.js
- script.xsl

And calling the Data Thing with a gist id, you can use the stored scripts.

Examples:

- <http://theapsgroup.github.io/Data-Thing/?9ac1897316509d397d15>
- <http://theapsgroup.github.io/Data-Thing/?afb53e880965541454d7>

Example
---------

Suppose you have the following JSON (randomly generated data): <http://beta.json-generator.com/PSKfAr_>

To simply return the email of the first record, type

    return input[0].email;

To get the names of blue-eyed records:

    return input.filter(function(r) {
        return r.eyeColor==='blue';
    }).map(function(r) {
        return {
            eyeColor: r.eyeColor,
            name: r.name
        }
    });

Or to create groups by eye color:

    return input.reduce(function(groups,r) {
        if (!groups[r.eyeColor]) {
            groups[r.eyeColor] = [];
        }
        groups[r.eyeColor].push({
            name: r.name
        });
        return groups;
    },{});
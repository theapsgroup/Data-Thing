Data Thing, by The APS Group
==========

Available, for your convenience, at <http://theapsgroup.github.io/Data-Thing/>

General purpose json fiddle tool. I found myself writing many small nodejs scripts just to transform data in another format. The overhead of reading and saving files is removed, furthermore a real-time feedback mechanism (better than console and nodemon) is added.

1. Load a json file by opening or dragging in.
2. Create a script by opening or creating from scratch. `Q` and `TreeLib` are available as globals, more (or a more generic way to inject dependencies) may follow.
3. Use the "magic" variable `input` and return a new output. Most simple script is `return input`
4. Save the result.

General way of working
------------

This thing needs a bit of getting used to. Some guidelines:

- match the input mode to what you are working with
- set modes to xml and xsl when working with those
- set output mode to 'JSON' first when working with js transformations
- make sure you output what you want, taking errors into account
- switch mode to text or tsv when you have a data structure that supports it (see next)

Working with text or xml
-------------

By setting the input mode to text, the input is interpreted as an array of strings, which can be used by JavaScript transformation scripts.

By setting the input mode to xml, the input is interpreted as jsonml, which is a JSON serialization of xml. This can be used by JavaScript or XSL transformation scripts.

By setting the input mode to tsv, the input is interpreted as tab separated values (with or without header). You'll get this when you paste from excel. This can be used by JavaScript transformation scripts.

By setting the output mode to text, the output MUST be an array of strings.

By setting the output mode to xml, the output MUST be valid jsonml, which is automatically produced by a correct xsl transformation

Output TSV or SQL
-----------

The following helper functions are available to output various text based file formats:

- makeTSV(arr);
- makeSQLInsert(arr,tableName);
- makeSQLUpdate(arr,tableName,key);

These all expect an array of the same objects.

Furthermore, the following helpers are available for your convenience.

- keys(obj);
- values(obj);

Linking gists
-----------

By creating a gist with at least one of the following files:

- input.js
- input.txt
- input.xml
- input.tsv
- script.js
- script.xsl

And calling the Data Thing with a gist id, you can use the stored scripts.

Examples:

- <http://theapsgroup.github.io/Data-Thing/#9ac1897316509d397d15>
- <http://theapsgroup.github.io/Data-Thing/#afb53e880965541454d7>


Example
---------

Suppose you have the following JSON (randomly generated data): <http://beta.json-generator.com/PSKfAr_>

### Getting specific data

Return the email adress of the zeroth record

    return input[0].email;

### Filtering

Return only records with blue eyes:

    return input.filter(function(r) {
        return r.eyeColor==='blue';
    })

### Mapping (creating a new / modified record for every record)

Return only eye color and name:

    return input.map(function(r) {
        return {
            eyeColor: r.eyeColor,
            name: r.name
        }
    });

### A combination of functions:

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

Data Thing, by The APS Group
==========

Available, for your convenience, at <http://theapsgroup.github.io/Data-Thing/>

General purpose json fiddle tool. I found myself writing many small nodejs scripts just to transform data in another format. The overhead of reading and saving files is removed, furthermore a real-time feedback mechanism (better than console and nodemon) is added.

1. Load a json file by opening or dragging in.
2. Create a script by opening or creating from scratch. `Q` and `TreeLib` are available as globals, more (or a more generic way to inject dependencies) may follow.
3. Use the "magic" variable `input` and return a new output. Most simple script is `return input`
4. Save the result.

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
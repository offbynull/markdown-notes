# Table of Contents
Use the following to generate a table of contents...
````
```{toc}
```
````

Output:

```{toc}
```

# Page Title

Set the title of the output document using the title inline/block tag:

````
```{title}
Markdown Example!
```
````

Output: (see the title of this HTML page)

```{title}
Markdown Example!
```

If you're using a block tag, make sure you put the title on a NEW line (not on the same line that declares the tag).

# Bookmarks

Bookmarks allow you to automatically create links in your markdown document using regex. That is, if a piece of text matches some regex pattern, it'll automatically link back to the point where that regex was declared.

If all you care about is quickly bookmarking a piece of text, the simplest usage of this tag is `` `{bm} <LABEL>` ``. For example, `` `{bm} coke zero` ``: `{bm} coke zero` will be the reference for coke zero, cOkE zErO, and coke zeros (it's case-insensitive).

If you care about more elaborate use-cases, the details below provide advance usage instructions.

To create a bookmark, use the `{bm} bm` tag: `` `{bm} <LABEL>/<REGEX>/<REGEX_FLAGS>/<SHOW_PRE>/<SHOW_POST>` ``. This tag takes in 5 arguments...

 1. `<LABEL>`: Text to output where the bookmark is _declared_.
 
     That is, the place where you define this tag is the place that this label gets output (in bold).

 2. `<REGEX>`: Regex used to match text in the document (_requires exactly 1 capture group_).
 
     When text is matched, the text that gets captured by capture group 1 is the text that gets output and linkified. The portion matched before/after capture group 1 will be used for matching but won't be linkified, and depending on `SHOW_PRE`/`SHOW_POST` may or may not be output.

 3. `<REGEX_FLAGS>`: Regex flags to use for `<REGEX>`.
 
    Currently only the i flag is supported (i = ignore case).

 4. `<SHOW_PRE>`: true/false indicating if text before `<REGEX>`'s capture group 1 should be output.

 5. `<SHOW_POST>`: true/false indicating if text after `<REGEX>`'s capture group 1 should be output.

There are 2 short-hand forms for bookmarks:

 * `` `{bm} <LABEL>` `` ⟶ `` `{bm} <LABEL>/(<LABEL>)/i/false/false` ``

   This form is good for quickly bookmarking a piece of a text. It's intended for the most common cases: where you don't care about case sensitivity and you're just doing basic text search (no fancy regex constructs). It's using `<LABEL>` as both the label and the regex, where in the regex it's being wrapped in parenthesis such that the entire thing is capture group 1. It also defaults `<SHOW_PRE>` and `<SHOW_POST>` to false.

 * `` `{bm} <LABEL>/<REGEX>/<REGEX_FLAGS>` `` ⟶ `` `{bm} <LABEL>/<REGEX>/<REGEX_FLAGS>/false/false` ``

   This form essentially just defaults `<SHOW_PRE>` and `<SHOW_POST>` to false.

Example usage / output:

* `` `{bm} <LABEL>` ``
  * `` `{bm} diet coke` ``: `{bm} diet coke` will be the reference for diet coke, dIeT cOKE, and diet cokes.
* `` `{bm} <LABEL>/<REGEX>/<REGEX_FLAGS>` ``
  * `` `{bm} this text/\b(dog)s?\b/i` ``: `{bm} this text/\b(dog)s?\b/i` will be the reference for DOG and dogs but not doggy, doggo, or ddog.
  * `` `{bm} this text/(carp\w+s?)/` ``: `{bm} this text/(carp\w+s?)/` will be the reference for carps, carpenter, and carpenters, but not carp.
  * `` `{bm} this text/hello\s+(world)/i` ``: `{bm} this text/hello\s+(world)/i` will be the reference for hello world. Even though the word hello was specified and matched on, it won't be included in the output because it isn't captured by `<REGEX>`'s capture group 1.
* `` `{bm} <LABEL>/<REGEX>/<REGEX_FLAGS>/<SHOW_PRE>/<SHOW_POST>` ``
  * `` `{bm} grams/\d+(grams|gram|g)\b/i/true/false` ``: `{bm} grams/\b\d+(grams|gram|g)\b/i/true/false` will be the reference for a g, gram, or grams anytime it's following numbers: 12345g.

```{note}
Forward-slashes (`/`) are used to delimit arguments. If required, use back-slash to escape the delimiter (e.g. `\/`).
```

The sections below provide details on nuances of bookmarking (e.g. tie-breaking) as well as ancillary tags that help with bookmarking in large documents.

## Tie-breaking

In certain cases, multiple bookmarks may match a certain piece of text. To resolve this, the bookmark with the longest piece of text captured by capture group 1 is the one chosen. For example, if the bookmarks `` `{bm} label1/Samsung (Galaxy)/i/true/true` `` and `` `{bm} label2/Samsung (Galaxy Smartphone)/i/true/true` `` matched on the text **Samsung Galaxy Smartphone Holder**, the second bookmark would get chosen because capture group 1 returns a longer piece of text:

* `{bm} label1/Samsung (Galaxy)/i`
* `{bm} label2/Samsung (Galaxy Smartphone)/i`

The text Samsung Galaxy Smartphone Holder should link to label2 instead of label1.

If the length between capture group 1s is the same, the longest piece of text overall is the one that's chosen. For example, if the bookmarks `` `{bm} label3/Google (Pixel)/i/true/true` `` and `` `{bm} label4/Google (Pixel) 4a/i/true/true` `` matched on the text **Google Pixel 4a Holder**, the second bookmark would get chosen because both capture group 1s have the same length but the overall captured text from the second bookmark is larger:

* `{bm} label3/Google (Pixel)/i/true/true`
* `{bm} label4/Google (Pixel) 4a/i/true/true`

If the length of the overall text between the matches is the same, an error is thrown and you'll need to find a way to disambiguate. The typical way to disambiguate is to have the regex check for a suffix that doesn't get output when rendered.

Example usage / output:

```
* `{bm} base/(base)_pH/i`
* `{bm} base/(base)_DNA/i`

The word base_pH should link to the first bullet, while base_DNA should link to the second bullet.
```

* `{bm} base/(base)_pH/i`
* `{bm} base/(base)_DNA/i`

The word base_pH should link to the first bullet, while base_DNA should link to the second bullet.

```{note}
See bm-error for related disambiguation details.
```

## Skipping

Using the `{bm} bm-skip` tag, you can render any text without bookmark handling. That is, if the text matches a bm / bm-error / bm-ignore tag, it won't matter. 

Why is this useful? The bm-skip tag is typically used when some word matches a bookmark but that word is being used in a different context. For example, if I bookmarked Apple as a reference to the company that makes iPhones, I wouldn't want it to link text that was referring to apple as a fruit.

Example usage / output:

```
A mechanical `{bm} crane` is very big.
* The crane is lifting a truck (should be linked back)
* The `{bm-skip} crane` is flying away (should NOT be linked back -- referring to bird).
```

A mechanical `{bm} crane` is very big.
* The crane is lifting a truck (should be linked back)
* The `{bm-skip} crane` is flying away (should NOT be linked back -- referring to bird).

## Ignoring

Using the `{bm} bm-ignore` tag, you can match a piece of text using regex and explicitly leave that text unlinked. That is, where the bm tag linkifies any text that it matches, the bm-ignore tag leaves any text it matches unlinked.

Why's this useful? Imagine the following use-case: you've created a bookmark on the word product, but as a result you're also getting links back from words that contain the word product (links you don't want). For example, the word product gets linked back, but so does production, productive, byproduct.

Rather than explicitly seeking out each instance of these unwanted links and wrapping them in a bm-skip tag, you can use the bm-ignore tag. For example:

```
`{bm} product`
`{bm-ignore} production`
`{bm-ignore} productive`
`{bm-ignore} byproduct`
...
```

If the word production, productive, or byproduct are matched, they'll be left unlinked.

The bm-ignore tag's parameters are similar to the bm tag's parameters, except that there is no label: `` `{bm-ignore} <REGEX>/<REGEX_FLAGS>/<SHOW_PRE>/<SHOW_POST>` ``.

Similarly, there are 2 short-hand forms:

 * `` `{bm-ignore} <REGEX>` `` ⟶ `` `{bm} (<REGEX>)/i/false/false` `` (note that the regex is being wrapped in parenthesis)
 * `` `{bm-ignore} <REGEX>/<REGEX_FLAGS>` `` ⟶ `` `{bm} <REGEX>/<REGEX_FLAGS>/false/false` ``

Example usage / output:

 * `` `{bm-ignore} <REGEX>` ``
   
   ```
   `{bm-ignore} recessive allele`
   Bookmark `{bm} recessive` and `{bm} allele`, but ignore both of them together.
    * The term recessive should be linked back.
    * The term allele should be linked back.
    * The term recessive allele should NOT be linked back.
   ```

   `{bm-ignore} recessive allele`
   Bookmark `{bm} recessive` and `{bm} allele`, but ignore both of them together.
    * The term recessive should be linked back.
    * The term allele should be linked back.
    * The term recessive allele should NOT be linked back.

 * `` `{bm-ignore} <REGEX>/<REGEX_FLAGS>` ``
   
   ```
   `{bm-ignore} (basic)_norm/i`
   Bookmark `{bm} basic/(basic)_pH/i` when suffix is _pH and `{bm} basic/(basic)_lang/i` when suffix is _lang, but ignore when suffix is _norm.
    * The term basic_pH should be linked back to the _pH suffix.
    * The term basic_lang should be linked back to the _lang suffix.
    * The term basic_norm should NOT be linked back.
   ```

   `{bm-ignore} (basic)_norm/i`
   Bookmark `{bm} basic/(basic)_pH/i` when suffix is _pH and `{bm} basic/(basic)_lang/i` when suffix is _lang, but ignore when suffix is _norm.
    * The term basic_pH should be linked back to the _pH suffix.
    * The term basic_lang should be linked back to the _lang suffix.
    * The term basic_norm should NOT be linked back.

## Erroring

Using the `{bm} bm-error` tag, you can match a piece of text using regex and explicitly generate an error when a match is found. That is, where the bm tag linkifies any text that it matches, the bm-error tag crashes the application when it matches a piece of text.

Why's this useful? Imagine the following use-case: you're writing a document on biology and chemistry. You have 2 sections in the document that the word base relates to: base as in the pH scale and base as in a nucleotide base. Since the word base is being used in 2 different contexts, you create bookmarks that explicitly look for a suffix:

```
`{bm} base/(base)_pH/i`
`{bm} base/(base)_DNA/i`
```

As you continue writing your document, you never want the word base to be used by itself -- it should almost always refer to one of the 2 bookmarks. You can use the bm-error tag to explicitly stop you from using the word base by itself:

```
`{bm} base/(base)_pH/i`
`{bm} base/(base)_DNA/i`
`{bm-error} Use base_pH if referring to pH scale, base_DNA if referring to nucleotides, or base_NORM to leave as-is/(base)/i`
```

```{note}
The bm-skip tag works on bm-error as well. That is, if a piece of text wrapped in a bm-skip tag that matches bm-error won't result in an error.
```

The bm-ignore tag's parameters are similar to the bm tag's parameters, except that label is replaced by the error message: `` `{bm-error} <ERROR_MSG>/<REGEX>/<REGEX_FLAGS>/<SHOW_PRE>/<SHOW_POST>` ``.

Similarly, there are 2 short-hand forms:

 * `` `{bm-error} <ERROR_MSG>/<REGEX>` `` ⟶ `` `{bm} <ERROR_MSG>/(<REGEX>)/i/false/false` `` (note that the regex is being wrapped in parenthesis)
 * `` `{bm-error} <ERROR_MSG>/<REGEX>/<REGEX_FLAGS>` `` ⟶ `` `{bm} <ERROR_MSG>/<REGEX>/<REGEX_FLAGS>/false/false` ``

```{note}
Since bm-error tags don't render anything, what's the point of having `<SHOW_PRE>` and `<SHOW_POST>`? bm-error tags can be redirected via bm-redirect. That is, you can make temporarily make it so that rather than erroring out on a match, that matched text will instead link to another bm-error.
```

Example usage / output:

```
`` `{bm-error} Base is too ambiguous. Use either base_pH or base_nucleotide/\b(base)\b/i` ``
* The term base_pH should be linked back to the _pH suffix.
* The term base_nucleotide should be linked back to the _nucleotide suffix.
* The term base should cause the render process to error.
```

OUTPUT NOT POSSIBLE BECAUSE THROWN ERROR WOULD CANCEL RENDER.

## Redirecting (all instances)

A bm / bm-ignore / bm-error tag can be redirected to another bm / bm-ignore / bm-error tag using `{bm} bm-redirect`, then reset back to normal using the `{bm} bm-reset` tag. That is, you can make it so that if the linker matches a piece of text, instead of performing the intended action, it'll perform the action for some other bookmark.
 
The bm-redirect tag takes in 2 arguments: `` `{bm-redirect} <SRC_TEXT>/<DST_TEXT>` ``...

 1. `<SRC_TEXT>`: Text that targets the bookmark being redirected from.
 2. `<DST_TEXT>`: Text that targets the bookmark being redirected to.

The bm-reset tag takes 1 arguments: `` `{bm-reset} <DST_TEXT>` ``...

 1. `<DST_TEXT>`: Text that targets a bookmark.

Why's this useful? Imagine the following use-case: you're writing a document on biology and chemistry. You have 2 sections in the document that the word base relates to: base as in the pH scale and base as in a nucleotide base. Since the word base is being used in 2 different contexts, you create bookmarks that explicitly look for a suffix:

```
`{bm-ignore} base`
`{bm} base/(base)_pH/i`
`{bm} base/(base)_DNA/i`
```

As you continue writing your document, the word base used in...
* chemistry related text will very likely refer to the pH scale.
* biology related text will very likely refer to nucleotides.

Each section can redirect the word base to the appropriate bookmark, then reset it once that section is over.

Example usage / output:

```
`{bm-ignore} product`

* `{bm} product/(product)_MATH/i` (math multiplication)
* `{bm} product/(product)_CHEM/i` (chemistry)

`{bm-redirect} product/product_CHEM`

Much of chemistry research is focused on the synthesis and characterization of beneficial products, as well as the detection and removal of undesirable products. Synthetic chemists can be subdivided into research chemists who design new chemicals and pioneer new methods for synthesizing chemicals, as well as process chemists who scale up chemical production and make it safer, more environmentally sustainable, and more efficient.[3] Other fields include natural product chemists who isolate products created by living organisms and then characterize and study these products.

`{bm-reset} product`

Every instance of product in paragraph above should be linked to the chemistry reference.
```

`{bm-ignore} product`

* `{bm} product/(product)_MATH/i` (math multiplication)
* `{bm} product/(product)_CHEM/i` (chemistry)

`{bm-redirect} product/product_CHEM`

Much of chemistry research is focused on the synthesis and characterization of beneficial products, as well as the detection and removal of undesirable products. Synthetic chemists can be subdivided into research chemists who design new chemicals and pioneer new methods for synthesizing chemicals, as well as process chemists who scale up chemical production and make it safer, more environmentally sustainable, and more efficient.[3] Other fields include natural product chemists who isolate products created by living organisms and then characterize and study these products.

`{bm-reset} product`

Every instance of product in paragraph above should be linked to the chemistry reference.

## Redirecting (single instance)

Any piece of text can be directed directed to a bm tag it wasn't intended for using `{bm} bm-target`. That is, you can make it so that a piece of text specifically links to some other bookmark that wouldn't normally link that piece of text.
 
The bm-target tag takes in 2 arguments: `` `{bm-target} <OUTPUT>/<SRC_TEXT>` ``...

 1. `<OUTPUT>`: Text to output and linkify.
 2. `<DST_TEXT>`: Text that targets the bookmark being redirected to.


```{note}
This ONLY works for linking text to bm tags, not bm-ignore/bm-error. bm-ignore explicitly doesn't link the regex it searches for and bm-error throws an error if it sees the regex it's searching for.
```

Why's this useful? For the same reason as bm-redirect. A single one-off piece of text can be easily redirected to a bookmark that it wasn't intended for.

Example usage / output:

```
`{bm} junk bookmark`

* this should point to junk bookmark.
* this one should also point to `{bm-target} the bookmark above/junk bookmark`.
```

`{bm} junk bookmark`

* this should point to junk bookmark.
* this one should also point to `{bm-target} the bookmark above/junk bookmark`.

## Disabling

A bm / bm-ignore / bm-error tag can be temporarily disabled and then re-enabled using the `{bm} bm-disable` and `{bm} bm-enable` tags. Disabling a bookmark doesn't mean that other bookmarks can't redirect to it, it just means that the linker will ignore this bookmark when matching text.

Why's this useful? Imagine that you set a bookmark match to produce an error (bm-error) but in certain cases you want to use that matched text without generating an error. Disabling allows for that.

The bm-disable and bm-enable tag both take 1 argument each: `` `{bm-reset} <DST_TEXT>` ``...

 1. `<DST_TEXT>`: Text that targets a bookmark.

Example usage / output:

```
Bookmark `{bm} Sao Paulo`.
* Sao Paulo should be linked back.
* `{bm-disable} Sao Paulo` Sao Paulo should NOT be linked back `{bm-enable} Sao Paulo`.
```

Bookmark `{bm} Sao Paulo`.
* Sao Paulo should be linked back.
* `{bm-disable} Sao Paulo` Sao Paulo should NOT be linked back `{bm-enable} Sao Paulo`.

## Disabling All

The linker can be temporarily disabled and then re-enabled using the `{bm} bm-disable-all` and `{bm} bm-enable-all` tags. That is, disabling the linker turns off all text matching functionality: bm / bm-ignore / bm-error.

Why's this useful? In certain cases you may have code / macro that's generating text. You may not know what that generated text is beforehand, meaning that the bookmark matches found in it may be unexpected / incorrect. Disabling all bookmark matches allows the text to be output as-is (no linkifying of the output).

Example usage / output:

```
Bookmark `{bm} caffeine`.
* Caffeine should `{bm-disable-all}` be linked back.
* Caffeine should NOT be linked back.

`{bm-enable-all}`
```

Bookmark `{bm} caffeine`.
* Caffeine should `{bm-disable-all}` be linked back.
* Caffeine should NOT be linked back.

`{bm-enable-all}`

# Macro

You can define custom inline and block macros specific to your markdown environment. When invoked, a custom macro pulls down a container (pulled from Dockerhub) and launches a script/application on it. The macro input is passed into the application. The macro output gets rendered as if it were normal markdown.

A macro is defined by placing a special directory in the same directory as your `input.md` file. The name of the directory must end with either...

 * `macro_block_` -- custom macro will be exposed as a block code tag
 * `macro_inline_` -- custom macro will be exposed as an inline code tag
 * `macro_all_` -- custom macro will be exposed as either a block code tag or inline code tag

...followed by the name of the custom macro. For example, a directory name `mycustomtag_macro_block` will get invoked whenever you drop in a block code tagged as `mycustomtag` in your `input.md` file.

The structure of this special directory must be as follows:

 * `[MACRO_DIR]/container`: a directory containing container setup files.
 * `[MACRO_DIR]/container/Dockerfile`: a Dockerfile that sets up the container.
 * `[MACRO_DIR]/container/*`: files/resources required by the `Dockerfile`.
 * `[MACRO_DIR]/input`: a directory containing input files.
 * `[MACRO_DIR]/input/run.sh`: a script that gets run when the container starts.
 * `[MACRO_DIR]/input/*`: files/resources required by `run.sh` and/or whatever it invokes.
 * `[MACRO_DIR]/settings.json`: a special settings file (described further below).

The `settings.json` file can be used to configure how the macro operates and what files to pass to it:

 * Hardcoded extra (shared) inputs can be passed to the container when it runs via `copyInputs`. For example, multiple macros may require the same shared piece of code. Rather than placing a copy of that code in each macro's `[MACRO_DIR]/input/` directory, you can reference a single copy from each macro.
 * User-defined extra (shared) inputs can be passed to the container when it runs via `copyInputsPrefix`. For example, the user can reference a specific image file for each usage of the macro to operate on.

```json
{
    // copyInputs
    //   > If an array, the array elements must be paths. These paths get made available
    //     in the container's /input directory when it runs.
    //   > If undefined, it's treated the same as an empty array.
    "copyInputs": [ "shared_dir1", "shared_dir2" ], 
    // copyInputsPrefix
    //   > If empty string, the first line of the macro usage must point to a path. That
    //     path gets made available in the container's /input directory when it runs.
    //   > If non-empty string, starting lines of the macro usage prefixed with this
    //     string must each point to a path. These paths get made available in the
    //     container's /input directory when it runs.
    //   > If undefined, the macro usage can't reference any files.
    "copyInputsPrefix": "!",
}
```

When a macro gets used, the system ...

 1. sets up a container based on `[MACRO_DIR]/container`. 
 1. copies `[MACRO_DIR]/input` to `/input` on the container.
 1. copies `[MACRO_DIR]/settings.json` shared resources to `/input` on the container.
 1. stores macro type to `/input/input.mode` on the container (`block` or `inline`).
 1. stores macro contents to `/input/input.data` on the container.
 1. stores macro `copyInputsPrefix` filepaths to `/input/input.files` on the container.
 1. stores a unique ID to `/input/.__UNIQUE_INPUT_ID` on the container.
 1. launches `/input/run.sh` on the container.
 1. expects output markdown in `/output/output.md` on the container.
 1. expects output css/js filepaths in `/output/output.injects` on the container (optional).

Any other files generated inside the container's `/output` are assumed to be resources referenced by `/output/output.md` or `/output.output.injects` and as such will get copied over to the root markdown input directory. The contents of ...

 * `/output/output.md` is markdown text to replace the macro usage with.
 * `/output/output.injections` is JSON of type `Array<[string, 'css' | 'js']>` (e.g. `[  ["file1.css", "css"], ["file2.js", "js"] ]`) to inject into the rendered HTML's head tag.

It's highly recommended that you don't write resources directly into `/output` directory due to filename collisions (e.g. two containers may decide to write to `/output/my_image.png`). Instead, `/input/.__UNIQUE_INPUT_ID` contains a hash of the input text into the container and the container itself, making it a unique and consistent ID. Placing resources in `/output/$(cat /input/.__UNIQUE_INPUT_ID)` instead of `/output` will ensure collisions don't happen.

The subsections below contain various macro examples. To use them in your own markdown, copy the macro directory into your root markdown directory.

## Example: Note

Input:

````
```{note}
This is a custom note.

![Image Example](https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Generic_Camera_Icon.svg/200px-Generic_Camera_Icon.svg.png)
```
````

Output:

```{note}
This is a custom note.

![Image Example](https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Generic_Camera_Icon.svg/200px-Generic_Camera_Icon.svg.png)
```

## Example: KaTeX

Input:

````
Inline equation `{kt} \frac{a}{b}`

```{kt}
\frac{a}{b}
```
````

Output:

Inline equation `{kt} \frac{a}{b}`

```{kt}
\frac{a}{b}
```

## Example: Source-code File Output

Input:

````
```{output}
InternalUtils.java
java
\n([ ]+static boolean isBalanced[\s\S]*?)\s+static boolean isCharged
```
````

Output:

```{output}
InternalUtils.java
java
\n([ ]+static boolean isBalanced[\s\S]*?)\s+static boolean isCharged
```

The output block takes in the following lines...
 * 1st line is the file path.
 * 2nd line (optional) is the language to use for highlighting syntax.
 * 3rd line (optional) is a regex that isolates the output to a specific portion of the file (capture group 1 is what get isolated).

The output will automatically be un-indented.

```{note}
Be aware that the isolation regex (line 3) does not use a DOT_ALL flag. That is, the `.` meta-character doesn't match new lines. If you want to match new lines, use something like `[\s\S]` instance.
```

## Example: CSV Table

Input:

````
```{csv}
!!{ "firstLineHeader": true }
Code,Country
AFG,Afghanistan
ALB,Albania
ALG,Algeria
ASA,American Samoa
AND,Andorra
ANG,Angola
AIA,Anguilla
ATG,Antigua and Barbuda
```
````

Output:

```{csv}
!!{ "firstLineHeader": true }
Code,Country
AFG,Afghanistan
ALB,Albania
ALG,Algeria
ASA,American Samoa
AND,Andorra
ANG,Angola
AIA,Anguilla
ATG,Antigua and Barbuda
```

CSV parsing can optionally be configured if by a single-line JSON object preceded by !!...

```{output}
csv_macro_block/input/code.js
js
// MARKDOWN_CONFIG\s*\n([\s\S]+)\n\s*// MARKDOWN_CONFIG
```

## Example: GraphViz

Input:

````
```{dot}
digraph {
  a -> b;
  b -> c;
  b -> d;
}
```
````

Output:

```{dot}
digraph {
  a -> b;
  b -> c;
  b -> d;
}
```

## Example: PlantUML

Input:

````
```{plantuml}
@startuml
class Student {
  Name
}
Student "0..*" - "1..*" Course
(Student, Course) .. Enrollment

class Enrollment {
  drop()
  cancel()
}
@enduml
```
````

Output:

```{plantuml}
@startuml
class Student {
  Name
}
Student "0..*" - "1..*" Course
(Student, Course) .. Enrollment

class Enrollment {
  drop()
  cancel()
}
@enduml
```

## Example: Svgbob

Input:

````
```{svgbob}
       ___     ___      
   ___/   \___/   \     
  /   \___/   \___/       Apple -----+
  \___/   \___/   \                  +----> Orange
  /   \___/   \___/       Banana ----+
  \___/   \___/   \     
      \___/   \___/     

```
````

Output:

```{svgbob}
       ___     ___      
   ___/   \___/   \     
  /   \___/   \___/       Apple -----+
  \___/   \___/   \                  +----> Orange
  /   \___/   \___/       Banana ----+
  \___/   \___/   \     
      \___/   \___/     
```

## Example: LaTeX Chemfig

Input:

````
```{chemfig}
\chemfig{Cl-[6]Co(<:[3]H_2O)(<[5]H_2O)(<[7]H_2O)(<:[9]H_2O)-[6]Cl}
```
````

Output:

```{chemfig}
\chemfig{Cl-[6]Co(<:[3]H_2O)(<[5]H_2O)(<[7]H_2O)(<:[9]H_2O)-[6]Cl}
```

All preamble and postamble text for the LaTeX document is automatically added by this extension -- only the chemfig LaTeX package is loaded.  For details on chemfig syntax, see [here](https://en.wikibooks.org/w/index.php?title=LaTeX/Chemical_Graphics&oldid=3452092).


## Example: Script Injection (CSS/JS)

Input:

````
```{scriptinject}
test
```
````

Output:

```{scriptinject}
test
```

## Example: Image Annotation

Input:

````
```{img}
201903_Ribosome.svg
Diagram of ribosome translating messanger RNA
By DataBase Center for Life Science (DBCLS) - http://togotv.dbcls.jp/ja/togopic.2019.06.html, CC BY 4.0, https://commons.wikimedia.org/w/index.php?curid=77793595

scale 0.45 0.45

fg_color #000000ff
bg_color #ffff00ff
text 0.1 0.1 mRNA strand

fg_color #ffff00ff
bg_color #00000000
arrow 0.1 0.1  0.1 0.55  0.25 0.55
poly 0.15 0.4  0.6 0.75  0.75 0.75  0.20 0.25
```
````

Output:

```{img}
201903_Ribosome.svg
Diagram of ribosome translating messanger RNA
By DataBase Center for Life Science (DBCLS) - http://togotv.dbcls.jp/ja/togopic.2019.06.html, CC BY 4.0, https://commons.wikimedia.org/w/index.php?curid=77793595

scale 0.45 0.45

fg_color #000000ff
bg_color #ffff00ff
text 0.1 0.1 mRNA strand

fg_color #ffff00ff
bg_color #00000000
arrow 0.1 0.1  0.1 0.55  0.25 0.55
poly 0.15 0.4  0.6 0.75  0.75 0.75  0.20 0.25
```

The first 3 lines must be as follows:
 1. file name prefixed with ! (should sit in the same directory as input.md).
 2. alternative text for the image (e.g. description of the image).
 3. title text for the image (e.g. attribution).

Subsequent lines are commands that you can use to manipulate and annotate the image...
 * *scale x_scale y_scale* -- scale the image by some percentage (unit is percentage).
 * *expand new_width new_height x_offset y_offset* -- expand the image canvas to some new dimension without resizing the contents (unit is percentage).
 * *crop x_offset y_offset new_width new_height* -- crop the image to some new dimension (unit is percentage).
 * *bg_color html_color_code* -- changes the background color.
 * *fg_color html_color_code* -- changes the foreground color.
 * *stroke width* -- changes the stroke width (unit is pixels).
 * *font_size size* -- changes the font size (unit is pixels).
 * *rect x_offset y_offset width height* -- highlight a rectangle on the image (unit is percentage).
 * *poly x1 y1 x2 y2 x3 y3 ...* -- highlight a polygon on the image (unit is percentage).
 * *arrow x1 y1 x2 y2 ...* -- draw an arrow on the image (unit is percentage).
 * *text x_offset y_offset string* -- write a string on the image (unit is percentage).

# Standard Markdown

Standard Markdown syntax guide (adapted from https://github.com/tchapi/markdown-cheatsheet).

## Headers

```
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

```{note}
Outputs left out so as to not pollute the table of contents.
```

## Text Formatting

Emphasized text:

_text_ --> `_text_` or `*text*`

Strong text:

__text__ -->  `__text__` or `**text**`

Strong emphasized text:

___text___ --> `___text___` or `***text***`

Link:

[text](http://www.google.com) --> `[text](http://www.google.com")`

Block quote:

> Blockquote
>> Nested blockquote

```
> Blockquote
>> Nested blockquote
```

Horizontal line:

- - - -

```
- - - -
```

## Image

Image:

![Messenger RNA structure](https://upload.wikimedia.org/wikipedia/commons/b/ba/MRNA_structure.svg)

```
![Messenger RNA structure](https://upload.wikimedia.org/wikipedia/commons/b/ba/MRNA_structure.svg)
```

## Lists

Unordered list:

* Some item 
    * Some inner item
        * Some inner inner item
* Some other item

```
* Some item 
    * Some inner item
        * Some inner inner item
* Some other item
```

Ordered list:

1. Some item 
    1. Some inner item
        1. Some inner inner item
        1. Some inner inner item
1. Some other item

```
1. Some item 
    1. Some inner item
        1. Some inner inner item
        1. Some inner inner item
1. Some other item
```

## Table

No flavour of markdown tables are supported. You can use CSV tables instead.

## Code

Code can either be inline in a paragraph or as a standalone block. Only standalone blocks can have syntax highlighting.

Inline code block example:

`inlineCode(arg1, arg2)` --> `` `inlineCode(arg1, arg2)` ``

Block code block example:

```java
import java.io.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Throwable {
    Files.write(Paths.get("/output/text.txt"), "hello world".getBytes(StandardCharsets.UTF_8), StandardOpenOption.CREATE);
  }
}
```

````
```java
import java.io.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Throwable {
    Files.write(Paths.get("/output/text.txt"), "hello world".getBytes(StandardCharsets.UTF_8), StandardOpenOption.CREATE);
  }
}
```
````
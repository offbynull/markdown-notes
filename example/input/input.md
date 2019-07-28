# Table of Contents
Use the following to generate a table of contents...
````
```{toc}
```
````

Output:

```{toc}
```

# Bookmarks

You can automatically link back to any piece of text by using the bm inline tag:
* `` `{bm} LITERAL` ``, where matches are made using basic case-insensitive text search.
* `` `{bm} LABEL/REGEX/REGEX_FLAGS` ``, where matches are made using the regex specified. The regex must have exactly 1 capture group, where the text captured by that group is what gets rendered and gets linked.

The tag can take in either 1 argument or 3 arguments, where forward-slashes (`/`) are used to delimit arguments. If required, use back-slash to escape the delimiter (e.g. `\/`).

Usage examples:
* `` `{bm} coke zero` `` -- `{bm} coke zero` will be the reference for coke zero, cOkE zErO, and coke zeros.
* `` `{bm} this text/\b(dog)s?\b/i` `` -- `{bm} this text/\b(dog)s?\b/i` will be the reference for DOG and dogs but not doggy, doggo, or ddog.
* `` `{bm} this text/(carp\w+s?)/` `` -- `{bm} this text/(carp\w+s?)/` will be the reference for carps, carpenter, and carpenters, but not carp.
* `` `{bm} this text/hello\s+(world)/i` `` -- `{bm} this text/hello\s+(world)/i` will be the reference for hello world. Even though the word hello was specified and matched on, it won't be included in the output because it isn't in the capture group.

In certain cases, multiple bookmarks may match a certain piece of text. To resolve this, the bookmark with the longest piece of text captured by the capture group is the one that gets linked to. For example, if the bookmarks *Samsung (Galaxy)* and *Samsung (Galaxy Smartphone)* matched on the text *Samsung Galaxy Smartphone Holder*, the second bookmark would get chosen because capture group 1 returns a longer piece of text.

If the length of the captured text between the matches are equal, an error is thrown and you'll need to find a way to disambiguate. 2 options are available:
1. You can explicitly prevent a piece of text from being matched to any bookmark by wrapping it in a bm-r inline tag (`` `{bm-ri} TEXT` ``). For example, coke zero should link to the example above but `{bm-ri} coke zero` won't. 
1. You can use the bm-ambiguous inline tag (`` `{bm-ambiguous} ERROR_TEXT/REGEX/REGEX_FLAGS` ``) to generate an error telling the user that they need to disambiguate. For example, you may want to create a bookmark for the word *base*, but in 2 different contexts: *base* as in pH scale and *base* as in nitrogenous base. You can use the bm-ambiguous tag to catch any instances of *base* and throw an error notify the user that they need to provide a more specialized version (e.g. `` `{bm-ambiguous} Base is too ambiguous. Use either base_pH or base_nucleotide/\b(base)\b/i` ``), which you can target using normal bm tags (e.g. `` `{bm} base/\b(base)_nucleotide?\b/i` `` -- this will match *base_nucleotide* but only output *base*).

# Notes

Generate notes by using the note block tag:

````
```{note}
This is a custom note.
```
````

Output:

```{note}
This is a custom note.
```

**TODO**: Add CSS styling for this.

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

# MathJax

Add a MathJax TeX expression using mj inline/block tag:

````
```{mj}
\frac{a}{b}
```
````

Inline output: `{mj} \frac{a}{b}`

Block output:

```{mj}
\frac{a}{b}
```

# KaTeX

Add a KaTeX TeX expression using kt inline/block tag:


````
```{kt}
\frac{a}{b}
```
````

Inline output: `{kt} \frac{a}{b}`

Block output:

```{kt}
\frac{a}{b}
```

# GraphViz Diagrams

Generate Graphviz dot diagrams by using dot block tag:

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

# PlantUML Diagrams

Add a PlantUML diagram using the plantuml block tag:

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

Block output:

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

# CSV

Add a table using the CSV block tag:

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

Block output:

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

# Conda (Python)

Add an image or text generated via Python (miniconda) using the conda block tag:

````
```{conda}
dependencies:
  - python=3.4
----
f = open("/output/text.txt","w+")
f.write("hello world!")
f.close()
```

```{conda}
dependencies:
  - python=3.7
  - matplotlib=3.1
----
import matplotlib.pyplot as plt
plt.plot([1, 2, 3, 4])
plt.ylabel('some numbers')
plt.savefig("/output/out.svg", format="svg")
```
````

Block output:

```{conda}
dependencies:
  - python=3.4
----
f = open("/output/text.txt","w+")
f.write("hello world!")
f.close()
```

```{conda}
dependencies:
  - python=3.7
  - matplotlib=3.1
----
import matplotlib.pyplot as plt
plt.plot([1, 2, 3, 4])
plt.ylabel('some numbers')
plt.savefig("/output/out.svg", format="svg")
```

The Miniconda environment YAML and Python source code are separated by `----`. The output produced by the Python script must be a single file written to the `/output` directory. That file must end in either `.txt`, `.svg`, `.png`, `.gif`, `.jpg`, or `.jpeg` -- the extension defines how the file gets displayed in the final markup.

# Standard Markdown

Normal CommonMark features are supported out of the box.

Block Code: 

```java
public static void main(String[] args) {
    ...;
}
```

Inline Code: `code`

Bold: **bold text**

Italic: *italicized text*

Blockquote:

> blockquote
> blockquote
> blockquote

Ordered List:

1. First item
2. Second item
3. Third item

Unordered List:

- First item
- Second item
- Third item

Horizontal Rule:

---

Link: [Link to Google](https://www.google.com)

Image: ![Image Alt Text](https://upload.wikimedia.org/wikipedia/en/7/7d/Lenna_%28test_image%29.png)

## heading2
### heading3
#### heading4
##### heading5
## heading 6
## heading 7
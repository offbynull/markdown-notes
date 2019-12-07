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

You can automatically linkify text using the bm inline tag. It comes in 2 variants: simple and advanced.

* `` `{bm} LITERAL` ``, where matches are made using basic case-insensitive text search.
  
  * `` `{bm} coke zero` `` -- `{bm} coke zero` will be the reference for coke zero, cOkE zErO, and coke zeros.

* `` `{bm} LABEL/REGEX/REGEX_FLAGS/SHOW_PRE/SHOW_POST` ``, where matches are made using a regex.

  REGEX must have exactly 1 capture group, where the text captured by that group is what gets rendered and linked. Matching text before/after group 1 may get rendered if SHOW_PRE/SHOW_POST is set to true (respectively).

  SHOW_PRE and SHOW_POST may be omitted -- they default to false.

  * `` `{bm} this text/\b(dog)s?\b/i` `` -- `{bm} this text/\b(dog)s?\b/i` will be the reference for DOG and dogs but not doggy, doggo, or ddog.
  * `` `{bm} this text/(carp\w+s?)/` `` -- `{bm} this text/(carp\w+s?)/` will be the reference for carps, carpenter, and carpenters, but not carp.
  * `` `{bm} this text/hello\s+(world)/i` `` -- `{bm} this text/hello\s+(world)/i` will be the reference for hello world. Even though the word hello was specified and matched on, it won't be included in the output because it isn't in the capture group.
  * `` `{bm} grams/\d+(grams|gram|g)\b/i/true/false` `` -- `{bm} grams/\b\d+(grams|gram|g)\b/i/true/false` will be the reference for a g, gram, or grams anytime it's following numbers: 12345g.

```{note}
Forward-slashes (`/`) are used to delimit arguments. If required, use back-slash to escape the delimiter (e.g. `\/`).
```

In certain cases, multiple bookmarks may match a certain piece of text. To resolve this, the bookmark with the longest piece of text captured by the capture group is the one that gets linked to. For example, if the bookmarks `` `{bm} label1/Samsung (Galaxy)/i` `` and `` `{bm} label2/Samsung (Galaxy Smartphone)/i` `` matched on the text _Samsung Galaxy Smartphone Holder_, the second bookmark would get chosen because capture group 1 returns a longer piece of text.

If the length of the captured text between the matches are equal, an error is thrown and you'll need to find a way to disambiguate. Several options are available:

 * `` `{bm-ri} TEXT` `` -- Render the encapsulated text without bookmark links.

   Example usage / output:
   
   ```
   Bookmark `{bm} dominant allele`.
    * Dominant allele should be linked back.
    * `{bm-ri} Dominant allele` should NOT be linked back.
   ```

   Bookmark `{bm} dominant allele`.
    * Dominant allele should be linked back.
    * `{bm-ri} Dominant allele` should NOT be linked back.

 * `` `{bm-ignore} TEXT` `` -- Render all instances of text without bookmark links.

   Example usage / output:
   
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

 * `` `{bm-ignore} REGEX/REGEX_FLAGS` `` -- Render all instances of text matching the regex without bookmark links.
 
   Note that the regex must have exactly 1 capture group. The text captured by that group is what gets rendered (similar to bm inline tag).

   Example usage / output:
   
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

 * `` `{bm-ambiguous} ERROR_MESSAGE/REGEX/REGEX_FLAGS` `` -- Throw error if any text matches.

   Example usage / output:
   
   ```
   `` `{bm-ambiguous} Base is too ambiguous. Use either base_pH or base_nucleotide/\b(base)\b/i` ``
    * The term base_pH should be linked back to the _pH suffix.
    * The term base_nucleotide should be linked back to the _nucleotide suffix.
    * The term base should cause the render process to error.
   ```

   OUTPUT NOT POSSIBLE BECAUSE THROWN ERROR WOULD CANCEL RENDER.

# Image Annotations

You can include local images and annotate / scale / crop them using the img block tag:

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
 1. file name (should sit in the same directory as input.md).
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


# Notes

Generate notes by using the note block tag:

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

**TODO**: Add CSS styling for this.

# CSV Table

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

# Math Typesetting

You can typeset math expressions using different HTML type setting engines.

```{note}
Right now, the preferred method of typesetting is to use KaTeX because it's more lightweight. MathJax 3 may change this (we're using an inline version of MathJax 2).
```

## MathJax

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

## KaTeX

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

# Diagrams

## GraphViz

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

## PlantUML

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

## LaTeX Chemfig

Generate LaTeX chemfig diagrams by using chemfig block tag:

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

# Language Support

You can generate output by passing in custom code to run in various programming languages. The code is built and run in an isolated container, so it should be safe. The container is set up such that...

 * `/input` is where the custom code and project files are located.
 * `/output` is where the output of the custom code is written.
 * `/files` is where markdown input files are located (read-only).

Your custom code must generate exactly 1 file in the  `/output` directory . That file must end in either `.txt`, `.csv`, `.svg`, `.png`, `.gif`, `.jpg`, or `.jpeg` -- the extension defines how the file gets displayed in the final markup.

```{note}
This may be useful for generating custom graphs/diagrams, or for doing various computations.
```

## Python

Add an image or text generated via Python (miniconda) using the conda block tag:

````
```{python}
f = open("/output/text.txt","w+")
f.write("hello world!")
f.close()
```

```{python}
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

The Miniconda environment YAML and Python source code are separated by `----`.

Block output:

```{python}
f = open("/output/text.txt","w+")
f.write("hello world!")
f.close()
```

```{python}
dependencies:
  - python=3.7
  - matplotlib=3.1
----
import matplotlib.pyplot as plt
plt.plot([1, 2, 3, 4])
plt.ylabel('some numbers')
plt.savefig("/output/out.svg", format="svg")
```

## Java

Add an image or text generated via Java (maven) using the java block tag:

````
```{java}
import java.io.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.*;

public class Main {
  public static void main(String[] args) {
    Files.write(Paths.get("/output/text.txt"), "hello world".getBytes(StandardCharsets.UTF_8), StandardOpenOption.CREATE);
  }
}
```

```{java}
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>unused</groupId>
  <artifactId>unused</artifactId>
  <version>unused</version>
  
  <properties>
    <maven.compiler.source>12</maven.compiler.source>
    <maven.compiler.target>12</maven.compiler.target>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.apache.xmlgraphics</groupId>
      <artifactId>batik-all</artifactId>
      <version>1.11</version>
    </dependency>
  </dependencies>
</project>
----
import java.awt.*;
import java.io.*;
import org.apache.batik.svggen.SVGGraphics2D;
import org.apache.batik.dom.GenericDOMImplementation;
import org.w3c.dom.Document;
import org.w3c.dom.DOMImplementation;

public class Main {

  public static void main(String[] args) throws IOException {
    DOMImplementation domImpl = GenericDOMImplementation.getDOMImplementation();

    String svgNS = "http://www.w3.org/2000/svg";
    Document document = domImpl.createDocument(svgNS, "svg", null);

    SVGGraphics2D svgGenerator = new SVGGraphics2D(document);
    svgGenerator.setPaint(Color.red);
    svgGenerator.fill(new Rectangle(10, 10, 100, 100));

    try (FileOutputStream fos = new FileOutputStream("/output/output.svg");
        Writer out = new OutputStreamWriter(fos, "UTF-8")) {
      svgGenerator.stream(out, true);
    }
  }
}
```
````

The Maven POM XML and Java source code are separated by `----`.

Block output:

```{java}
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

```{java}
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>unused</groupId>
  <artifactId>unused</artifactId>
  <version>unused</version>
  
  <properties>
    <maven.compiler.source>12</maven.compiler.source>
    <maven.compiler.target>12</maven.compiler.target>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.apache.xmlgraphics</groupId>
      <artifactId>batik-all</artifactId>
      <version>1.11</version>
    </dependency>
  </dependencies>
</project>
----
import java.awt.*;
import java.io.*;
import org.apache.batik.svggen.SVGGraphics2D;
import org.apache.batik.dom.GenericDOMImplementation;
import org.w3c.dom.Document;
import org.w3c.dom.DOMImplementation;

public class Main {

  public static void main(String[] args) throws IOException {
    DOMImplementation domImpl = GenericDOMImplementation.getDOMImplementation();

    String svgNS = "http://www.w3.org/2000/svg";
    Document document = domImpl.createDocument(svgNS, "svg", null);

    SVGGraphics2D svgGenerator = new SVGGraphics2D(document);
    svgGenerator.setPaint(Color.red);
    svgGenerator.fill(new Rectangle(10, 10, 100, 100));

    try (FileOutputStream fos = new FileOutputStream("/output/output.svg");
        Writer out = new OutputStreamWriter(fos, "UTF-8")) {
      svgGenerator.stream(out, true);
    }
  }
}
```

## NodeJS

Add an image or text generated via NodeJS (npm) using the node block tag:

````
```{node}
const fs = require('fs');
fs.writeFileSync("/output/output.txt", "Hey there!", { encoding: 'utf8' });
```

```{node}
{
  "scripts": {
    "start": "node code.js"
  },
  "dependencies": {
    "pureimage": "0.1.6"
  }
}
----
const fs = require('fs');
const PImage = require('pureimage');

var img = PImage.make(100,100);
var ctx = img.getContext('2d');
ctx.fillStyle = '#00ff00';
ctx.beginPath();
ctx.arc(50,50,40,0,Math.PI*2,true); // Outer circle
ctx.closePath();
ctx.fill();

PImage.encodePNGToStream(img, fs.createWriteStream('/output/out.png')).then(() => {
    console.log("wrote out the png file to out.png");
}).catch((e)=>{
    console.log("there was an error writing");
});
```
````

The NPM package JSON and Javascript source code are separated by `----`.

Block output:

```{node}
const fs = require('fs');
fs.writeFileSync("/output/output.txt", "Hey there!", { encoding: 'utf8' });
```

```{node}
{
  "scripts": {
    "start": "node code.js"
  },
  "dependencies": {
    "pureimage": "0.1.6"
  }
}
----
const fs = require('fs');
const PImage = require('pureimage');

var img = PImage.make(100,100);
var ctx = img.getContext('2d');
ctx.fillStyle = '#00ff00';
ctx.beginPath();
ctx.arc(50,50,40,0,Math.PI*2,true); // Outer circle
ctx.closePath();
ctx.fill();

PImage.encodePNGToStream(img, fs.createWriteStream('/output/out.png')).then(() => {
    console.log("wrote out the png file to out.png");
}).catch((e)=>{
    console.log("there was an error writing");
});
```

# Macro

Define a macro using the define-block and define-inline tags:

````
```{define-block}
testmacrob
macroa/
```

```{define-inline}
testmacroa
macrob/
```
````

```{define-block}
testmacrob
macroa/
```

```{define-inline}
testmacroa
macrob/
```

1st line is the name of the macro while 2nd line is a path to the macro's container environment. To apply a macro, use its name directly in a block or inline tag:

````
```{testmacrob}
hello
```

Some text before. `{testmacroa} hello` Some text after.
````

Output:

```{testmacrob}
hello block
```

Some text before. `{testmacroa} hello inline` Some text after.

```{note}
Macros must be defined prior to use.

For more information on container environments, see the paths for the example macros above.
```

A macro's container environment must contain...
 * `[PATH]/container`: a directory containing the container `Dockerfile` and any files required by it.
 * `[PATH]/input`: a directory containing input files (mapped to `/input` on container).
 * `[PATH]/input/run.sh`: a file that gets run when the container starts (mapped to `/input/run.sh` on container).

When a macro gets used, its container runs. The container expects ...
 * `/input/input.data` to contain the input text.
 * `/files` to contain all markdown files.
 * `/output/output.md` to get populated with the output markdown.
 * `/output/[RANDOM_DIR]` to get populated with the resources generated for output markdown (e.g. images, tables, etc..).

It's highly recommended that you place resources in `/output/[RANDOM_DIR]` instead of `/output`. Resources placed directly in `/output` may encounter name collisions when rendering. You can streamline the generation of `/output/[RANDOM_DIR]` via the shell -- for example:

```bash
rand=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 13)
# Script should write markdown to /output/output.md
# Script should write markdown resources to /output/$rand/ but reference them
#   in markdown as $rand/ (e.g. output to /output/$rand/out.png but reference
#   in output.md as $rand/out.png).
mkdir /output/$rand
npm start -- $rand
```

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
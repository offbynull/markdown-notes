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

# Image Annotations

You can include local images and annotate / scale / crop them using the img block tag:

````
```{img}
201903_Ribosome.svg
Diagram of ribosome translating messanger RNA
By DataBase Center for Life Science (DBCLS) - http://togotv.dbcls.jp/ja/togopic.2019.06.html, CC BY 4.0, https://commons.wikimedia.org/w/index.php?curid=77793595
scale 0.25 0.25
text 0.1 0.1 mRNA strand
arrow 0.1 0.1  0.1 0.55  0.2 0.55
highlight_poly 0.15 0.4  0.6 0.75  0.75 0.75  0.20 0.25
```
````

Output:

```{img}
201903_Ribosome.svg
Diagram of ribosome translating messanger RNA
By DataBase Center for Life Science (DBCLS) - http://togotv.dbcls.jp/ja/togopic.2019.06.html, CC BY 4.0, https://commons.wikimedia.org/w/index.php?curid=77793595
scale 0.45 0.45
text 0.1 0.1 mRNA strand
arrow 0.1 0.1  0.1 0.55  0.25 0.55
highlight_poly 0.15 0.4  0.6 0.75  0.75 0.75  0.20 0.25
```

The first 3 lines must be as follows:
 1. file name (should sit in the same directory as input.md).
 2. alternative text for the image (e.g. description of the image).
 3. title text for the image (e.g. attribution).

Subsequent lines are commands that you can use to manipulate and annotate the image...
 * *scale x_scale y_scale* -- scale the image by some percentage (unit is percentage).
 * *expand new_width new_height x_offset y_offset* -- expand the image canvas to some new dimension without resizing the contents (unit is percentage).
 * *crop x_offset y_offset new_width new_height* -- crop the image to some new dimension (unit is percentage).
 * *highlight x_offset y_offset width height* -- highlight a rectangle on the image (unit is percentage).
 * *highlight_poly x1 y1 x2 y2 x3 y3 ...* -- highlight a polygon on the image (unit is percentage).
 * *arrow x1 y1 x2 y2 ...* -- draw an arrow on the image (unit is percentage).
 * *text x_offset y_offset string* -- write a string on the image (unit is percentage).
 * *highlight_color html_color_code* -- changes the highlight color.
 * *font_color html_color_code* -- changes the font color.
 * *font_size size* -- changes the font size (unit is pixels).
 * *stroke_size size* -- changes the stroke size (unit is pixels).
 


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

## GraphViz (dot)

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
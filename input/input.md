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

You can automatically link back to any piece of text by using the bm inline tag: `` `{bm} SOME TEXT HERE` ``. For example, I can make all instances of the word `{bm} metagenomics` to reference back to this sentence.

Notice how in the markdown I write out `` `{bm} metagenomics` `` instead of the actual word. The text renders are plain text but anywhere else where the word metagenomics pops up, it automatically links to that bookmark. If you want to avoid having a specific instance link back, use `` `{bm-ri} metagenomics` `` instead of writing it out as plain text.

# DOT Graphs

Generate basic DOT graphs by using dot block tag:

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
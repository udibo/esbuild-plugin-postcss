(() => {
  // postcss:./a.scss
  var css = "body {\n  font: Helvetica, Arial, sans-serif;\n}\n\na {\n  color: #333;\n}\na:hover {\n  color: rgb(91.8, 91.8, 91.8);\n}";

  // a.ts
  console.log(css);
})();

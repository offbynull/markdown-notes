window.onload = () => {
  const elems = document.getElementsByClassName('SCRIPTINJECT_CLASS');
  for (var i=0, len=elems.length|0; i<len; i=i+1|0) {
    const parentNode = elems[i].parentNode;
    const replacement = document.createTextNode("ADDED_BY_JS|"); 
    parentNode.insertBefore(replacement, elems[i]);
    replacement.appendChild(elems[i])
  }
}
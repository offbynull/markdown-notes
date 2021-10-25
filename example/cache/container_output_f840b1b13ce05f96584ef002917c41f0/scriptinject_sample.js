window.onload = () => {
  const elems = document.getElementsByClassName('SCRIPTINJECT_CLASS');
  for (var i=0, len=elems.length|0; i<len; i=i+1|0) {
    elems[i].firstChild.textContent = "ADDED_BY_JS|" + elems[i].firstChild.textContent;
  }
}
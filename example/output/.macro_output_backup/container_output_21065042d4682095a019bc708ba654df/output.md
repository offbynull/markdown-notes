`{bm-disable-all}`[InternalUtils.java](InternalUtils.java) (lines 13 to 28):`{bm-enable-all}`

```java
static boolean isBalanced(ChemicalEquation ce) {
    Multiset<Element> reactantElementBag = HashMultiset.create();
    ce.reactants.items.stream()
            .flatMap(i -> nCopies(i.count, i.bond.items).stream())
            .flatMap(i -> i.stream())
            .forEach(bu -> reactantElementBag.add(bu.element, bu.count));
    
    Multiset<Element> productElementBag = HashMultiset.create();
    ce.products.items.stream()
            .flatMap(i -> nCopies(i.count, i.bond.items).stream())
            .flatMap(i -> i.stream())
            .forEach(bu -> productElementBag.add(bu.element, bu.count));
    
    return reactantElementBag.equals(productElementBag);
}
```
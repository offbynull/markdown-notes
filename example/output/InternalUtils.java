package com.offbynull.cetools;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import com.google.common.collect.Streams;
import static java.util.Collections.nCopies;

final class InternalUtils {
    private InternalUtils() {
        // do nothing
    }
    
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
    
    static boolean isCharged(ChemicalEquation ce) {
        return Streams.concat(ce.reactants.items.stream(), ce.products.items.stream())
                .anyMatch(i -> i.bond.charge != 0);
    }
    
    static boolean isPhasePresent(ChemicalEquation ce) {
        return Streams.concat(ce.reactants.items.stream(), ce.products.items.stream())
                .anyMatch(i -> i.bond.phase != null);
    }
}

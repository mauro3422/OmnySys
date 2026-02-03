/**
 * Calculator.test.js
 */

import { add, subtract, multiply } from './Calculator.js';

function testAdd() {
    const result = add(2, 3);
    if (result !== 5) throw new Error("Add failed");
    console.log("Add passed");
}

function testSubtract() {
    const result = subtract(5, 2);
    if (result !== 3) throw new Error("Subtract failed");
    console.log("Subtract passed");
}

testAdd();
testSubtract();

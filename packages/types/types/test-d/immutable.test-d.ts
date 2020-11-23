/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { expectError } from 'tsd';
import { Immutable } from '../dist/immutable';

const m = {
    a: [
        { n: 1, o: { n: 2 }},
    ]
}

const i: Immutable<typeof m> = m;

expectError(i.a = []);
expectError(i.a.push({ n: 2, o: { n: 3 }}));
expectError(i.a[0].n = 2);
expectError(i.a[0].o = { n: 2 });
expectError(i.a[0].o.n++);

m.a = [];
m.a.push({ n: 2, o: { n: 3 }});
m.a[0].n = 2;
m.a[0].o = { n: 2 };
m.a[0].o.n++;

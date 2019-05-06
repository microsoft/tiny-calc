import { Producer, Consumer, EnumerationContext, CancellationToken } from "@tiny-calc/nano";
import { RecordProducer } from "./common";

type SemanticPerson = {
    shortName: string;
    fullName: string;
    email: string;
    age: number;
    likesTea: boolean;
}

function semanticPersonEqual(l: SemanticPerson, r: SemanticPerson): boolean {
    for (const k in l) {
        if (l[k as keyof SemanticPerson] !== r[k as keyof SemanticPerson]) return false;
    }
    return true;
}

export type Person = RecordProducer<SemanticPerson>

interface CompanyGraph {
    link: (id: string, origin: Consumer<Person>) => void;
    unlink: (origin: Consumer<Person>) => void;
    invalidate: (source: Producer<Person>, id: string[]) => void;
}

const createGraph: () => CompanyGraph = () => {
    const dependencies = new Map<string, Set<Consumer<Person>>>();
    const graph: CompanyGraph = {
        link: (id, origin) => {
            if (!dependencies.has(id)) {
                dependencies.set(id, new Set());
            }
            dependencies.get(id)!.add(origin);
        },
        unlink: (origin) => {
            dependencies.forEach(dependents => {
                if (dependents) {
                    dependents.delete(origin);
                }
            });
        },
        invalidate: (source, changed) => {
            const toNotify = new Set<Consumer<Person>>();
            for (let i = 0; i < changed.length; i += 1) {
                const dependents = dependencies.get(changed[i]);
                if (dependents) {
                    dependents.forEach(c => toNotify.add(c))
                }
            }
            const changeSet: Record<string, Person> = {};
            changed.forEach(name => {
                changeSet[name] = source.now(name, x => x, () => { throw "TODO" });
            })
            toNotify.forEach(c => c.updates(source, changeSet))
        }
    }
    return graph;
}

export class Company implements Producer<Person> {
    id = "Company"
    graph: CompanyGraph;
    records: Record<string, Person>
    constructor(data: SemanticPerson[]) {
        this.graph = createGraph();
        this.records = {};
        data.forEach(person => {
            const id = person.shortName;
            this.records[id] = new RecordProducer(id, person, semanticPersonEqual);
        });
    }

    unsubscribe(consumer: Consumer<Person>) {
        this.graph.unlink(consumer);
    }

    enumerate(
        context: EnumerationContext | string,
        _token: CancellationToken,
        withResults: (v: any, done: boolean) => boolean,
        withError: (err?: unknown) => void
    ) {
        if (typeof context !== "number") {
            return withError();
        }
        const batch = 10;
        let bucket = [];
        for (const k in this.records) {
            switch (context) {
                case EnumerationContext.Properties:
                    bucket.push(k);
                    break;
                case EnumerationContext.Values:
                    bucket.push(this.records[k]);
                    break;
                case EnumerationContext.Both:
                    bucket.push({ property: k, value: this.records[k] })
            }
            if (bucket.length === batch) {
                if (!withResults(bucket, false)) {
                    return;
                }
                bucket = [];
            }
        }
        withResults(bucket, true);
    }

    now<R>(property: string, cont: (value: Person) => R, reject: (err?: unknown) => R): R {
        const value = this.records[property];
        if (this.records[property] === undefined) {
            return reject();
        }
        return cont(value);
    }

    request<R>(
        origin: Consumer<Person>,
        property: string,
        cont: (value: Person) => R,
        reject: (err?: unknown) => R
    ): R {
        const value = this.records[property];
        if (this.records[property] === undefined) {
            return reject();
        }
        this.graph.link(property, origin);
        return cont(value);
    }

    map(fn: (p: SemanticPerson) => SemanticPerson) {
        const dirty = [];
        for (const k in this.records) {
            const old = this.records[k];
            const updated = old.map(fn);
            if (old === updated) { continue }
            this.records[k] = updated;
            dirty.push(k);
        }
        this.graph.invalidate(this, dirty);
    }
}

export const simpleCompany = new Company(
    [
        {
            "shortName": "Corrine",
            "fullName": "Love Mccormick",
            "email": "lovemccormick@sealoud.com",
            "age": 723,
            "likesTea": true
        },
        {
            "shortName": "Haley",
            "fullName": "Gilbert Mckay",
            "email": "gilbertmckay@sealoud.com",
            "age": 607,
            "likesTea": true
        },
        {
            "shortName": "Flossie",
            "fullName": "Marianne Boyle",
            "email": "marianneboyle@sealoud.com",
            "age": 572,
            "likesTea": false
        },
        {
            "shortName": "Hampton",
            "fullName": "Marjorie Espinoza",
            "email": "marjorieespinoza@sealoud.com",
            "age": 285,
            "likesTea": true
        },
        {
            "shortName": "Goodwin",
            "fullName": "Traci Oconnor",
            "email": "tracioconnor@sealoud.com",
            "age": 161,
            "likesTea": false
        },
        {
            "shortName": "Alexis",
            "fullName": "Holt Gomez",
            "email": "holtgomez@sealoud.com",
            "age": 713,
            "likesTea": false
        },
        {
            "shortName": "Leticia",
            "fullName": "Kim Villarreal",
            "email": "kimvillarreal@sealoud.com",
            "age": 777,
            "likesTea": false
        },
        {
            "shortName": "Moody",
            "fullName": "French Barker",
            "email": "frenchbarker@sealoud.com",
            "age": 796,
            "likesTea": true
        },
        {
            "shortName": "Emerson",
            "fullName": "Vega Rosa",
            "email": "vegarosa@sealoud.com",
            "age": 279,
            "likesTea": true
        },
        {
            "shortName": "Tyler",
            "fullName": "Benjamin Jones",
            "email": "benjaminjones@sealoud.com",
            "age": 270,
            "likesTea": true
        },
        {
            "shortName": "Wood",
            "fullName": "Nixon Osborne",
            "email": "nixonosborne@sealoud.com",
            "age": 360,
            "likesTea": false
        },
        {
            "shortName": "Thornton",
            "fullName": "Dorthy Horne",
            "email": "dorthyhorne@sealoud.com",
            "age": 683,
            "likesTea": false
        },
        {
            "shortName": "Wooten",
            "fullName": "Simon Richard",
            "email": "simonrichard@sealoud.com",
            "age": 362,
            "likesTea": false
        },
        {
            "shortName": "Powell",
            "fullName": "Hayden Mueller",
            "email": "haydenmueller@sealoud.com",
            "age": 206,
            "likesTea": true
        },
        {
            "shortName": "Trevino",
            "fullName": "Martha Lawrence",
            "email": "marthalawrence@sealoud.com",
            "age": 758,
            "likesTea": true
        },
        {
            "shortName": "Jannie",
            "fullName": "Dillard Jensen",
            "email": "dillardjensen@sealoud.com",
            "age": 469,
            "likesTea": false
        },
        {
            "shortName": "Angie",
            "fullName": "Alvarado Wood",
            "email": "alvaradowood@sealoud.com",
            "age": 885,
            "likesTea": false
        },
        {
            "shortName": "Preston",
            "fullName": "Russo Richmond",
            "email": "russorichmond@sealoud.com",
            "age": 370,
            "likesTea": true
        },
        {
            "shortName": "Gamble",
            "fullName": "Keisha Campos",
            "email": "keishacampos@sealoud.com",
            "age": 959,
            "likesTea": false
        },
        {
            "shortName": "Heath",
            "fullName": "Darcy Baldwin",
            "email": "darcybaldwin@sealoud.com",
            "age": 752,
            "likesTea": false
        },
        {
            "shortName": "Carla",
            "fullName": "Gould Kirk",
            "email": "gouldkirk@sealoud.com",
            "age": 714,
            "likesTea": true
        },
        {
            "shortName": "Guadalupe",
            "fullName": "Weiss Weaver",
            "email": "weissweaver@sealoud.com",
            "age": 354,
            "likesTea": true
        },
        {
            "shortName": "Castaneda",
            "fullName": "Herminia Mitchell",
            "email": "herminiamitchell@sealoud.com",
            "age": 158,
            "likesTea": true
        },
        {
            "shortName": "Martinez",
            "fullName": "Faye Owens",
            "email": "fayeowens@sealoud.com",
            "age": 704,
            "likesTea": true
        },
        {
            "shortName": "Irwin",
            "fullName": "Atkins King",
            "email": "atkinsking@sealoud.com",
            "age": 672,
            "likesTea": true
        },
        {
            "shortName": "Angelica",
            "fullName": "Good Sharpe",
            "email": "goodsharpe@sealoud.com",
            "age": 792,
            "likesTea": true
        },
        {
            "shortName": "Rebecca",
            "fullName": "Jackson Trujillo",
            "email": "jacksontrujillo@sealoud.com",
            "age": 154,
            "likesTea": false
        },
        {
            "shortName": "Keith",
            "fullName": "Augusta Kirby",
            "email": "augustakirby@sealoud.com",
            "age": 996,
            "likesTea": true
        },
        {
            "shortName": "Rosalyn",
            "fullName": "Cora Clarke",
            "email": "coraclarke@sealoud.com",
            "age": 941,
            "likesTea": false
        },
        {
            "shortName": "Melinda",
            "fullName": "Oneill Nunez",
            "email": "oneillnunez@sealoud.com",
            "age": 830,
            "likesTea": false
        },
        {
            "shortName": "Lancaster",
            "fullName": "Perez Lynn",
            "email": "perezlynn@sealoud.com",
            "age": 474,
            "likesTea": true
        },
        {
            "shortName": "Diaz",
            "fullName": "Rebekah Wiggins",
            "email": "rebekahwiggins@sealoud.com",
            "age": 166,
            "likesTea": true
        },
        {
            "shortName": "Morgan",
            "fullName": "Meghan Frazier",
            "email": "meghanfrazier@sealoud.com",
            "age": 546,
            "likesTea": false
        },
        {
            "shortName": "Grimes",
            "fullName": "Warren Nielsen",
            "email": "warrennielsen@sealoud.com",
            "age": 116,
            "likesTea": false
        },
        {
            "shortName": "Sonja",
            "fullName": "Bonita Washington",
            "email": "bonitawashington@sealoud.com",
            "age": 947,
            "likesTea": false
        },
        {
            "shortName": "Davenport",
            "fullName": "Walsh Berg",
            "email": "walshberg@sealoud.com",
            "age": 298,
            "likesTea": false
        },
        {
            "shortName": "Dunlap",
            "fullName": "Lorie Rocha",
            "email": "lorierocha@sealoud.com",
            "age": 872,
            "likesTea": false
        },
        {
            "shortName": "Curtis",
            "fullName": "Jamie Reeves",
            "email": "jamiereeves@sealoud.com",
            "age": 888,
            "likesTea": true
        },
        {
            "shortName": "Chelsea",
            "fullName": "Moran Branch",
            "email": "moranbranch@sealoud.com",
            "age": 238,
            "likesTea": true
        }
    ]
);

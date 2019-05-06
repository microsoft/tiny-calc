import { table } from "table";

export interface TableViewer {
    update: (header: string[], formulas: string[], data: string[][]) => void
}

export const viewer: TableViewer = {
    update: (header, formulas, data) => {
        console.clear();
        data.unshift(formulas);
        data.unshift(header);
        console.log(table(data))
    }
}

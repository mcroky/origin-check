import {analyzeIngredients,type IngredientAnalysis} from './ingredients';
export function registeredIngredients(fields:string[]):IngredientAnalysis{
 const evidence=fields.flatMap(field=>analyzeIngredients(field).evidence),positive=evidence.some(e=>e.kind==='direct'||e.kind==='possible'),negative=evidence.some(e=>e.kind==='excluded');
 const status:IngredientAnalysis['status']=positive&&negative?'uncertain':evidence.some(e=>e.kind==='direct')?'direct':evidence.some(e=>e.kind==='possible')?'possible':evidence.some(e=>e.kind==='uncertain')?'uncertain':evidence.length?'excluded':'not-found';
 return {status,evidence};
}

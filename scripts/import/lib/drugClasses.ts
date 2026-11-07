// Label prose often names a drug CLASS ("may enhance the effect of anticoagulants"), not a drug.
// Curated, standard pharmacology membership (ingredient keys from lib/ingredients.ts).
// Keep conservative: only well-established class members. Unknown members are reported by the miner.
export type DrugClassRule = { label: string; phrase: RegExp; members: string[] };

export const DRUG_CLASSES: DrugClassRule[] = [
  { label: "anticoagulants", phrase: /\b(oral )?anti-?coagulants\b|\banti-?coagulant (drugs?|medicines?|agents?|therapy|treatment)\b|\bcoumarins?\b/i, members: ["warfarin", "acenocoumarol", "rivaroxaban", "apixaban", "dabigatran etexilate", "heparin", "enoxaparin"] },
  { label: "NSAIDs", phrase: /\bnsaids?\b|non-?steroidal anti-?inflammatory/i, members: ["ibuprofen", "diclofenac", "naproxen", "aceclofenac", "ketorolac", "etoricoxib", "celecoxib", "indomethacin", "mefenamic acid", "piroxicam", "meloxicam", "tenoxicam", "ketoprofen", "flurbiprofen", "etodolac", "nabumetone", "lornoxicam", "dexketoprofen", "aspirin"] },
  { label: "salicylates", phrase: /\bsalicylates?\b/i, members: ["aspirin"] },
  { label: "antacids", phrase: /\bantacids?\b/i, members: ["aluminium hydroxide", "magnesium hydroxide", "magnesium trisilicate", "magaldrate", "calcium carbonate"] },
  { label: "MAO inhibitors", phrase: /\bmaois?\b|\bmao[- ]inhibitors?\b|monoamine oxidase inhibitors?/i, members: ["selegiline", "rasagiline", "moclobemide", "linezolid"] },
  { label: "SSRIs", phrase: /\bssris?\b|selective serotonin re-?uptake inhibitors?/i, members: ["fluoxetine", "sertraline", "paroxetine", "citalopram", "escitalopram", "fluvoxamine"] },
  { label: "tricyclic antidepressants", phrase: /tricyclic (anti-?depressants?|agents?)|\btcas?\b/i, members: ["amitriptyline", "imipramine", "nortriptyline", "clomipramine", "doxepin", "dothiepin"] },
  { label: "benzodiazepines", phrase: /\bbenzodiazepines?\b/i, members: ["diazepam", "alprazolam", "clonazepam", "lorazepam", "bromazepam", "midazolam", "chlordiazepoxide", "clobazam"] },
  { label: "corticosteroids", phrase: /\bcortico-?steroids?\b/i, members: ["prednisolone", "dexamethasone", "hydrocortisone", "methylprednisolone", "betamethasone", "deflazacort"] },
  { label: "thiazide diuretics", phrase: /\bthiazides?\b/i, members: ["hydrochlorothiazide", "chlorthalidone", "indapamide"] },
  { label: "loop diuretics", phrase: /\bloop diuretics?\b/i, members: ["furosemide", "torsemide", "bumetanide"] },
  { label: "diuretics", phrase: /(?<!thiazide |thiazide-like |loop |potassium[- ]sparing )\bdiuretics?\b/i, members: ["furosemide", "hydrochlorothiazide", "chlorthalidone", "indapamide", "spironolactone", "torsemide", "bumetanide", "eplerenone", "amiloride"] },
  { label: "potassium-sparing diuretics", phrase: /potassium[- ]sparing/i, members: ["spironolactone", "eplerenone", "amiloride"] },
  { label: "beta-blockers", phrase: /\bbeta[- ]?(adrenergic |adrenoceptor )?(blockers?|blocking agents?|antagonists?)\b|β[- ]?blockers?/i, members: ["propranolol", "atenolol", "metoprolol", "bisoprolol", "carvedilol", "nebivolol"] },
  { label: "ACE inhibitors", phrase: /\bace[- ]inhibitors?\b|angiotensin[- ]converting enzyme inhibitors?/i, members: ["captopril", "enalapril", "lisinopril", "ramipril", "perindopril"] },
  { label: "antidiabetic drugs", phrase: /\b(oral )?(anti-?diabetics?|hypoglyc(a)?emic (agents?|drugs?))\b|\bsulfonylureas?\b|\bsulphonylureas?\b/i, members: ["metformin", "gliclazide", "glimepiride", "glibenclamide", "glipizide", "sitagliptin", "linagliptin", "vildagliptin", "empagliflozin", "dapagliflozin"] },
  { label: "anticonvulsants", phrase: /\banti-?convulsants?\b|\banti-?epileptics?\b/i, members: ["phenytoin", "carbamazepine", "sodium valproate", "valproic acid", "phenobarbital", "lamotrigine", "levetiracetam", "topiramate", "oxcarbazepine"] },
  { label: "statins", phrase: /\bstatins?\b|hmg-?coa reductase inhibitors?/i, members: ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin", "pitavastatin"] },
  { label: "macrolides", phrase: /\bmacrolides?\b/i, members: ["erythromycin", "clarithromycin", "azithromycin"] },
  { label: "quinolones", phrase: /\b(fluoro)?quinolones?\b/i, members: ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin", "norfloxacin"] },
  { label: "proton pump inhibitors", phrase: /proton[- ]pump inhibitors?|\bppis?\b/i, members: ["omeprazole", "esomeprazole", "pantoprazole", "rabeprazole", "lansoprazole"] },
  { label: "oral contraceptives", phrase: /\b(oral |hormonal )?contraceptives?\b/i, members: ["ethinyl estradiol", "levonorgestrel", "desogestrel", "drospirenone"] },
  { label: "azole antifungals", phrase: /\bazole antifungals?\b|\bazoles\b/i, members: ["ketoconazole", "itraconazole", "fluconazole", "voriconazole"] },
  { label: "cardiac glycosides", phrase: /cardiac glycosides?|digitalis/i, members: ["digoxin"] },
];

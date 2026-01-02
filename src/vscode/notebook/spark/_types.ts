export type NotebookType =
	"fabric-spark-notebook"
	| "jupyter-notebook"
	;

export type SparkNotebookLanguage =
	"sql"
	| "spark" // = scala
	| "sparkr"
	| "pyspark"
	;

export type SparkNotebookMagic =
	"sql"
	| "spark" // = scala
	| "sparkr"
	| "pyspark"
	| "run"
	;

export type SparkVSCodeLanguage =
	"sql"
	| "scala" // = scala
	| "r"
	| "python"
	;

export class SparkLanguageConfig {
	public language: SparkNotebookLanguage; // e.g. SQL, Scala, Python, R
	public magic: SparkNotebookMagic; // e.g. sql, spark, pyspark, sparkr
	public vscodeLanguage: SparkVSCodeLanguage; // e.g. sql, scala, python, r
	public commentChar: string; // e.g. --, //, #, #

	constructor(language: SparkNotebookLanguage, magic: SparkNotebookMagic, vscodeLanguage: SparkVSCodeLanguage, commentChar: string) {
		this.language = language;
		this.magic = magic;
		this.vscodeLanguage = vscodeLanguage;
		this.commentChar = commentChar;
	}
}
export class SparkLanguageConfigs {
	static readonly _config = [
		new SparkLanguageConfig("sql", "sql", "sql", "--"),
		new SparkLanguageConfig("spark", "spark", "scala", "//"),
		new SparkLanguageConfig("pyspark", "pyspark", "python", "#"),
		new SparkLanguageConfig("sparkr", "sparkr", "r", "#"),
	]

	static getLanguageByMagic(magic: string): SparkNotebookLanguage {
		let config = this.getConfigByMagic(magic);
		return config ? config.language : undefined;
	}

	static getConfigByMagic(magic: string): SparkLanguageConfig {
		if(magic.startsWith("%%")) {
			magic = magic.substring(2);
		}
		let lang = this._config.find(l => l.magic.toLowerCase() === magic.toLowerCase());
		return lang;
	}

	static getCommentCharByLanguage(language: SparkNotebookLanguage): string {
		let lang = this._config.find(l => l.language.toLowerCase() === language.toLowerCase());
		return lang ? lang.commentChar : undefined;
	}

	static getLanguagesByCommentchars(commentChars: string): SparkNotebookLanguage[] {
		let langs = this._config.filter(l => l.commentChar === commentChars);
		return langs.map(l => l.language);
	}

	static getConfigsByCommentchars(commentChars: string): SparkLanguageConfig[] {
		let langs = this._config.filter(l => l.commentChar === commentChars);
		return langs;
	}
}


export interface iFabricApiLivySessionJsonResultSet {
	schema: {
					type: string;
					fields: 
						{
							name: string;
							type: string;
							nullable: boolean;
							metadata: any;
						}[]
	};
	data: any[][];
}
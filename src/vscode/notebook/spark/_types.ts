export type NotebookType =
	"jupyter-notebook"
	| "fabric-spark-notebook"
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

	static getLanguageByMagic(magic: SparkNotebookMagic): SparkNotebookLanguage {
		let lang = this._config.find(l => l.magic.toLowerCase() === magic.toLowerCase());
		return lang ? lang.language : undefined;
	}

	static getCommentCharByLanguage(language: SparkNotebookLanguage): string {
		let lang = this._config.find(l => l.language.toLowerCase() === language.toLowerCase());
		return lang ? lang.commentChar : undefined;
	}
}


export namespace main {
	
	export class UpdateInfo {
	    available: boolean;
	    version: string;
	    downloadUrl: string;
	    body: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.version = source["version"];
	        this.downloadUrl = source["downloadUrl"];
	        this.body = source["body"];
	        this.error = source["error"];
	    }
	}

}


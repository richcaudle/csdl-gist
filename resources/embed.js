(function() {

	var csdl = %%CSDL%%;

	/**
	* The stream is basically a singly linked list, each node has the call to the next node as soon as we reach the node
	* where the next is null, we have reached the end of our linked list
	*
	* <h2>Examples</h2>
	*
	* // creating the object
	* var a = new Stream();
	* a.add('a');
	*
	* // accessing the object
	* console.log(a.character);
	* // returns a
	*
	* console.log(a.next);
	* // return Object (the next item
	*/
	function Stream() {
		this.head = null;
	}

	/**
	* Stream prototype
	*/
	Stream.prototype = {
		/**
		* Add a new item into the linked list (see above comment), setting the head to the first node
		*
		* <h2>options</h2>
		* - String Character
		*
		* <h2>Example</h2>
		* (see above)
		*/
		add: function(character) {
			var node = {
				character: character,
				next: null
			}
			if (this.head == null) {
				this.head = node;
			} else {
				var current = this.head;
				while(current.next) {
					current = current.next;
				}
				current.next = node;
			}
		}
	}

	/**
	* Tokenizer, splits the string into a set of formatted words
	*
	* This sweet little piece of code will take in a string of CSDL and will output the formatted version. It works by
	* first splitting the string into characters, and then building up a buffer of the current word. Once it reached a space
	* character or the end of the string (denoted by the null in the linked list) it will format the buffered string
	* determining what type it is.
	*
	* <h2>Options</h2>
	*
	* - String (string) - The portion or CSDL you want to convert
	*
	* <h2>Example</h2>
	*
	* tokenizer('interaction.content contains "hello world"')
	* // returns <span class="predicate">interaction.content</span> <span class="operator">contains</span> <span class="string">"hello world"</span>
	*
	*/
	var tokenizer = function(string) {

		var token = {
			/**
			* Buffer of the current word
			*/
			buffer: '',

			/**
			* The formatted string
			*/
			formatted: '',

			/**
			* Flag that we are currently processing a string
			*/
			stringFlag: false,

			commentFlag: false,

			inlineCommentFlag: false,

			blockCommentFlag: false,

			EOL: 2,

			/**
			* Format each of the buffered words
			*/
			format: function(flag) {

				if(this.buffer.length === 0) return;

				if(this.buffer.indexOf("\\n") > -1)
				{
					this.formatted += "<br/>";
					this.buffer = this.buffer.replace("\\n", "");
				}

				if(this.buffer.indexOf("\\t") > -1)
				{
					this.formatted += "&nbsp;&nbsp;";
					this.buffer = this.buffer.replace("\\t", "");
				}

				var className = 'datasift-predicate';

				// test for operators
				var operators = new Array(
					"<", "<=", "==", "<>", ">", ">=", "cs", "contains_word", "contains_phrase", "or", "contains", "and",
					"not", "in", "geo_box", "regex_exact", "exists", "float", "contains_any", "any", "wildcard", "url_in");
				for (operator in operators) {
					if (this.buffer.toLowerCase() == operators[operator]) {
						className = 'datasift-operator';
					}
				}

				// test for keywords
				var keywords = new Array("tag", "tags", "stream", "filter", "return");
				for (keyword in keywords) {
					if (this.buffer.toLowerCase() == keywords[keyword]) {
						className = 'datasift-keyword';
					}
				}

				// the above only catches simple (non-namespaced tags)
				if(/tag\./.test(this.buffer.toLowerCase()))
				{
					className = 'datasift-keyword';
				}

				// test for numbers
				if (/^[-+]?\d+\.?\d*$/i.test(this.buffer)) {
					className = 'datasift-int';
				}

				// test for strings
				var stringIndex = this.buffer.indexOf('"');

				if (this.stringFlag) {
					if (this.buffer.indexOf('"') != -1) {
						this.stringFlag = false;
					}
					className = 'datasift-string';
				} else {
					if (this.buffer.indexOf('"') != -1) {
						this.stringFlag = true;
						className = 'datasift-string';
					}
				}

				// if we are starting and closing the string in the same token
				if (this.buffer.indexOf('"') != -1 && this.buffer.indexOf('"') == 0
				&& this.buffer.lastIndexOf('"') == this.buffer.length - 1) {
					this.hadStringFlag = this.stringFlag;
					this.stringFlag = false;
				}

				// test for comments, we test last so that you can comment a predict
				if (this.inlineCommentFlag || this.blockCommentFlag) {
					if (this.buffer.indexOf('*/') != -1) {
						this.blockCommentFlag = false;
					}
					className = 'datasift-comment';
				}

				if (this.buffer.indexOf('/*') != -1 && !this.hadStringFlag) {
					this.blockCommentFlag = true;
					className = 'datasift-comment';
				}

				if (this.buffer.indexOf('//') != -1 && !this.hadStringFlag) {
					this.inlineCommentFlag = true;
					className = 'datasift-comment';
				}

				this.hadStringFlag = false;

				this.formatted += '<span class="' + className + '">' + this.buffer + '</span>';

				if (flag && flag == this.EOL && this.inlineCommentFlag) {
					this.inlineCommentFlag = false;
				}
				this.buffer = '';
			},

			/**
			* Iterator to go over each of the characters determine their type and return the formatted string. This
			* function will recurse over the stream object calling the next character and determining the type
			*
			* <h2>Options</h2>
			* - Stream (Stream) a Object of type stream to iterate over
			*/
			iterate: function(stream) {
				if (stream.next) {
					switch(stream.character) {
						case ' ':
							this.format();
							this.formatted += '&nbsp;';
							break;

						case '}' :
							this.format();
							this.formatted += '}';
							break;

						case '{' :
							this.format();
							this.formatted += '{';
							break;

						case ')' :
							this.format();
							this.formatted += ')';
							break;

						case '(' :
							this.format();
							this.formatted += '(';
							break;

						case '\n':
							this.format(this.EOL);
							this.formatted += '<br/>';
							break;

						case '\t':
							this.format();
							this.formatted += '&nbsp;&nbsp;';
							break;

						default:
							this.buffer += stream.character;
							break;
					}

					return this.iterate(stream.next);
				}
				this.buffer += stream.character;
				this.format();
				return this.formatted;
			}
		}

		// split up the string
		var characters = (string.trim() + " ").split('');

		// create the linked list
		var stream = new Stream();
		for (var i = 0; i < characters.length; i++) {
			stream.add(characters[i]);
		}

		// return the formatted string
		return token.iterate(stream.head);
	}

	// Adds CSDL styles to the page
	var addCSS = function(string) {
		var style = document.createElement('style');
		style.type = 'text/css';
		var innerStyle = ".datasift-embed{margin-top: 4px;font-family:Helvetica,Arial,sans-serif;font-size:12px;overflow: hidden;font-style:normal;font-weight:normal;text-transform:none;letter-spacing:normal;line-height:1.5em}.datasift-embed code{font-family:\"courier new\";background:#EFEFEF;padding:10px 15px;border:1px solid #DCDCDC;border-bottom:0px;display:block;-webkit-border-top-left-radius:3px;-webkit-border-top-right-radius:3px;-moz-border-radius-topleft:3px;-moz-border-radius-topright:3px;border-top-left-radius:3px;border-top-right-radius:3px} .datasift-embed code .datasift-keyword{color:black} .datasift-embed code .datasift-operator{color:red} .datasift-embed code .datasift-string{color:green;white-space:nowrap}.datasift-embed code .datasift-predicate{color:blue}.datasift-embed code .datasift-int{color:darkgreen}.datasift-embed code .datasift-comment{color:grey;}.datasift-embed .datasift-embed-footer{margin-bottom: 4px;background:#2C2B33;border:1px solid #0B0B0D;padding:10px 10px;overflow:hidden;-webkit-border-bottom-left-radius:3px;-webkit-border-bottom-right-radius:3px;-moz-border-radius-bottomleft:3px;-moz-border-radius-bottomright:3px;border-bottom-left-radius:3px;border-bottom-right-radius:3px}.datasift-embed .datasift-embed-footer a{color:#FFF;text-decoration:none;display:block;float:left;margin-right:5px}.datasift-embed .datasift-embed-footer a.logo{background:url('http://datasift.com/images/logo-small.png');margin-right:0px;float:right;height:20px;width:68px;text-indent:900px;overflow:hidden}strong.name{float:left;margin-right:5px;color:#FFF;}";

		if (style.styleSheet) {
			style.styleSheet.cssText = innerStyle;
		} else {
			style.innerHTML = innerStyle;
		}
		document.getElementsByTagName("head")[0].appendChild(style);
	}

	// Creates a CSDL widget from CSDL text
	var createWidget = function(csdl) {
		var widget =
			'<div class="datasift-embed"><code class="datasift-embed">' + tokenizer(csdl.content) + '</code>' +
			'<div class="datasift-embed-footer">' +
			'<a href="' + csdl.url + '" target="_blank"><strong>' + csdl.filename + '</strong></a>' +
			'<a href="http://datasift.com" class="logo" target="_blank">DataSift</a><br style="clear:both;" /></div></div>';
		document.write(widget);
	}

	addCSS();

	if(csdl)
	{
		for (i = 0; i < csdl.length; ++i) {
		    createWidget(csdl[i]);
		}
	}
	else
	{
		document.write('<em>-- Failed to embed CSDL --</em>');
	}

})();
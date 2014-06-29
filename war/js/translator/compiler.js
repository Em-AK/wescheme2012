// if not defined, declare the compiler object as part of plt
if(typeof(plt) === "undefined")          plt = {};
if(typeof(plt.compiler) === "undefined") plt.compiler = {};

/*
 TODO
 - toJSON method for each bytecode struct
 - toJSON for number literals
 - figure out desugaring/compilation of identifiers
 - figure out desugaring/compilation of primops
 - figure out desugaring/compilation of quoted expressions
 - compiled-indirects
 */


(function (){

    numberExpr.prototype.toJSON = function(){
      return {"$": 'constant', "value" : this.val};
    };
    stringExpr.prototype.toJSON = function(){
      return {"$": 'constant', "value" : this.val};
    };
    symbolExpr.prototype.toJSON = function(){
      return "types.symbol("+this.val+")";
    };
 
    /**************************************************************************
     *
     *    BYTECODE STRUCTS -
     *    (see https://github.com/bootstrapworld/wescheme-compiler2012/blob/master/js-runtime/src/bytecode-structs.ss)
     *
     **************************************************************************/
 
 
    // all Programs, by default, print out their values and have no location
    // anything that behaves differently must provide their own toJSON() function
    var Bytecode = function() {
      // -> JSON
      this.toJSON = function(){ console.log(this); throw "IMPOSSIBLE - generic bytecode toJSON method was called on"; };
    };

    // for mapping JSON conversion over an array
    function convertToJSON(bc){ return (bc instanceof Bytecode)? bc.toJSON() : bc.toString(); }
 
    // literal
    function literal(val) {
      Bytecode.call(this);
      this.val = val;  // could be a numberExpr, vectorExpr, stringExpr
      this.toJSON = function(){
        return {"$": 'constant', "value" : this.val.toJSON()};
      };
    };
    literal.prototype = heir(Bytecode.prototype);

    // Global bucket
    function globalBucket(name) {
      Bytecode.call(this);
      this.name = name;  // symbol
      this.toJSON = function(){return {"$":'global-bucket', "value": this.name.toString()};};
    };
    globalBucket.prototype = heir(Bytecode.prototype);

    // Module variable
    function moduleVariable(modidx, sym, pos, phase) {
      Bytecode.call(this);
      this.$    = 'module-variable';
      this.modidx = modidx; // module-path-index
      this.sym    = sym;    // symbol
      this.pos    = pos;    // exact integer
      this.phase  = phase;  // 1/0 - direct access to exported id
      this.toJSON = function(){
        return {"$":'module-variable', "modidx": this.modix.toJSON(), "sym" : this.sym.toJSON(),
                "pos" : this.pos.toJSON(), "phase" : this.phase.toJSON()};
      };
    };
    moduleVariable.prototype = heir(Bytecode.prototype);

    // Wrap syntax object
    function wrap() {
      Bytecode.call(this);
    };
    wrap.prototype = heir(Bytecode.prototype);

    // Wrapped syntax object
    function wrapped(datum, wraps, certs) {
      Bytecode.call(this);
      this.datum  = datum;  // any
      this.wraps  = wraps;  // list of wrap
      this.certs = certs;   // list or false
    };
    wrapped.prototype = heir(Bytecode.prototype);

    // Stx
    function stx(encoded) {
      this.encoded  = encoded;  // wrapped
      Bytecode.call(this);
    };
    stx.prototype = heir(Bytecode.prototype);

    // prefix
    function prefix(numLifts, topLevels, stxs) {
      Bytecode.call(this);
      this.numLifts   = numLifts;  // exact, non-negative integer
      this.topLevels  = topLevels; // list of (false, symbol, globalBucket or moduleVariable)
      this.stxs       = stxs;      // list of stxs
      this.toJSON = function(){
        return {"$":'prefix', "num-lifts": this.numLifts, "toplevels" : this.topLevels.map(convertToJSON),
                "stxs" : this.stxs.map(convertToJSON)};
      };
    };
    prefix.prototype = heir(Bytecode.prototype);

    // form
    function form() {
      Bytecode.call(this);
    };
    form.prototype = heir(Bytecode.prototype);

    // expr
    function expr(form) {
      Bytecode.call(this);
    };
    expr.prototype = heir(Bytecode.prototype);

    // Indirect
    function indirect(v) {
      Bytecode.call(this);
      this.v  = v; // ??
      this.toJSON = function(){
        return {"$":'indirect', "v": this.v.toJSON()};
      };
    };
    indirect.prototype = heir(Bytecode.prototype);

    // compilationTop
    function compilationTop(maxLetDepth, prefix, code) {
      Bytecode.call(this);
      this.maxLetDepth= maxLetDepth;  // exact non-negative integer
      this.prefix     = prefix;       // prefix
      this.code       = code;         // form, indirect, or any
      this.toJSON = function(){
        return {"$":'compilation-top', "max-let-depth": this.maxLetDepth, "prefix" : this.prefix.toJSON(),
              "compiled-indirects" : [], "code" : this.code.toJSON()};
      };
    };
    compilationTop.prototype = heir(Bytecode.prototype);

    // provided
    function provided(name, src, srcName, nomSrc, srcPhase, isProtected, insp) {
      Bytecode.call(this);
      this.name     = name;      // symbol
      this.src      = src;       // false or modulePathIndex
      this.srcName  = srcName;   // symbol
      this.nomSrc   = nomSrc;    // false or modulePathIndex
      this.srcPhase = srcPhase;  // 0/1
      this.insp     = insp;      // boolean or void
      this.isProtected=isProtected; // boolean
    };
    provided.prototype = heir(Bytecode.prototype);

    // topLevel
    function topLevel(depth, pos, constant, ready, loc) {
      Bytecode.call(this);
      this.depth    = depth;    // exact, non-negative integer
      this.pos      = pos;      // exact, non-negative integer
      this.constant = constant; // boolean
      this.ready    = ready;    // boolean
      this.loc      = loc;      // false or Location
      this.toJSON = function(){
        return {"$":'toplevel', "depth": this.depth.toString(), "pos" : this.pos.toString(),
               "const?" : this.constant, "ready?" : this.ready, "loc" : this.loc && this.loc.toVector().toJSON()};
      };
    };
    topLevel.prototype = heir(Bytecode.prototype);

    // seq
    function seq(forms) {
      Bytecode.call(this);
      this.forms    = forms;  // list of form, indirect, any
      this.toJSON = function(){
        return {"$":'seq', "forms": this.forms.map(convertToJSON)};
      };
    };
    seq.prototype = heir(Bytecode.prototype);

    // defValues
    function defValues(ids, rhs) {
      Bytecode.call(this);
      this.ids  = ids;  // list of toplevel or symbol
      this.rhs  = rhs;  // expr, indirect, seq, any
      this.toJSON = function(){
        return {"$":'def-values', "ids": this.ids.map(convertToJSON), "body" : this.rhs.toJSON()};
      };
    };
    defValues.prototype = heir(Bytecode.prototype);

    // defSyntaxes
    function defSyntaxes(ids, rhs, prefix, maxLetDepth) {
      Bytecode.call(this);
      this.$          = 'def-values';
      this.ids        = ids;      // list of toplevel or symbol
      this.rhs        = rhs;      // expr, indirect, seq, any
      this.prefix     = prefix;   // prefix
      this.maxLetDepth= maxLetDepth; // exact, non-negative integer
      this.toJSON = function(){
        return {"$":'def-values', "ids": this.ids.toJSON(), "rhs" : this.rhs.toJSON(),
               "prefix" : this.prefix.toJSON(), "max-let-depth" : this.maxLetDepth.toJSON()};
      };
    };
    defSyntaxes.prototype = heir(Bytecode.prototype);

    // defForSyntax
    function defForSyntax(ids, rhs, prefix, maxLetDepth) {
      Bytecode.call(this);
      this.ids        = ids;      // list of toplevel or symbol
      this.rhs        = rhs;      // expr, indirect, seq, any
      this.prefix     = prefix;   // prefix
      this.maxLetDepth= maxLetDepth; // exact, non-negative integer
    };
    defForSyntax.prototype = heir(Bytecode.prototype);

    // mod
    function mod(name, selfModidx, prefix, provides, requires, body,
                 syntaxBody, unexported, maxLetDepth, dummy, langInfo,
                 internalContext) {
      Bytecode.call(this);
      this.name       = name;         // exact, non-negative integer
      this.selfModidx = selfModidx;   // exact, non-negative integer
      this.prefix     = prefix;       // boolean
      this.provides   = provides;     // boolean
      this.requires   = requires;     // false or Location
      this.body       = body;         // exact, non-negative integer
      this.syntaxBody = syntaxBody;   // exact, non-negative integer
      this.unexported = unexported;   // boolean
      this.maxLetDepth= maxLetDepth;  // exact, non-negative integer
      this.dummy      = dummy;        // false or Location
      this.langInfo   = langInfo;     // false or (vector modulePath symbol any)
      this.internalContext = internalContext;
      this.toJSON = function(){
        return {"$":'mod', "name": this.name.toJSON(), "self-modidx" : this.selfModidx.toJSON(),
               "prefix" : this.prefix.toJSON(), "provides" : this.provides.toJSON(),
               "requires" : this.requires && this.requires.toVector().toJSON(), "body" : this.body.toJSON(),
               "stx-body" : this.syntaxBody.toJSON(), "max-let-depth" : this.maxLetDepth.toJSON()};
      };
    };
    mod.prototype = heir(Bytecode.prototype);

    // lam
    function lam(name, operatorAndRandLocs, flags, numParams, paramTypes,
                 rest, closureMap, closureTypes, maxLetDepth, body) {
      Bytecode.call(this);
      this.name       = name;         // symbol, vector, empty
      this.flags      = flags;        // (list of ('preserves-marks 'is-method 'single-result))
      this.numParams  = numParams;    // exact, non-negative integer
      this.paramTypes = paramTypes;   // list of ('val 'ref 'flonum)
      this.rest       = rest;         // boolean
      this.body       = body;         // expr, seq, indirect
      this.closureMap = closureMap;   // vector of exact, non-negative integers
      this.maxLetDepth= maxLetDepth;  // exact, non-negative integer
      this.closureTypes=closureTypes; // list of ('val/ref or 'flonum)
      this.operatorAndRandLocs = operatorAndRandLocs;
      // operator+rand-locs includes a list of vectors corresponding to the location
      // of the operator, operands, etc if we can pick them out.  If we can't get
      // this information, it's false
      this.toJSON = function(){
        return {"$":'lam', "name": this.name, "locs" : this.operatorAndRandLocs.map(convertToJSON),
               "flags" : this.flags.map(convertToJSON),
               "num-params" : this.numParams, "param-types" : this.paramTypes.map(convertToJSON),
               "rest?" : this.rest, "closure-map" : this.closureMap.map(convertToJSON),
               "closure-types" : this.closureTypes.map(convertToJSON), "max-let-depth" : this.maxLetDepth,
               "body" : this.body.toJSON()
               };
      };
    };
    lam.prototype = heir(Bytecode.prototype);


    // closure: a static closure (nothing to close over)
    function closure(code, genId) {
      Bytecode.call(this);
      this.code     = code;  // lam
      this.genId    = genId; // symbol
      this.toJSON = function(){
        return {"$":'closure', "code": this.code.toJSON(), "gen-id" : this.genId.toJSON()};
      };
    };
    closure.prototype = heir(Bytecode.prototype);

    // caseLam: each clause is a lam (added indirect)
    function caseLam(name, clauses) {
      Bytecode.call(this);
      this.name     = name;  // symbol, vector, empty
      this.clauses  = clauses; // list of (lambda or indirect)
      this.toJSON = function(){
        return {"$":'case-lam', "name": this.name.toJSON(), "clauses" : this.clauses.toJSON()};
      };
    };
    caseLam.prototype = heir(Bytecode.prototype);

    // letOne
    function letOne(rhs, body, flonum) {
      Bytecode.call(this);
      this.rhs     = rhs;   // expr, seq, indirect, any
      this.body    = body;  // expr, seq, indirect, any
      this.flonum  = flonum;// boolean
      this.toJSON = function(){
        return {"$":'let-one', "rhs": this.rhs.toJSON(), "body" : this.body.toJSON(),
               "flonum" : this.flonum.toJSON()};
      };
    };
    letOne.prototype = heir(Bytecode.prototype);

    // letVoid
    function letVoid(count, boxes, body) {
      Bytecode.call(this);
      this.count   = count;   // exact, non-negative integer
      this.boxes   = boxes;   // boolean
      this.body    = body;    // expr, seq, indirect, any
      this.toJSON = function(){
        return {"$":'let-void', "count": this.count.toJSON(), "boxes" : this.boxes.toJSON(),
               "body" : this.body.toJSON()};
      };
    };
    letVoid.prototype = heir(Bytecode.prototype);

    // letRec: put `letrec'-bound closures into existing stack slots
    function letRec(procs, body) {
      Bytecode.call(this);
      this.procs   = procs;   // list of lambdas
      this.body    = body;    // expr, seq, indirect, any
      this.toJSON = function(){
        return {"$":'let-rec', "procs": this.procs.toJSON(),"body" : this.body.toJSON()};
      };
    };
    letRec.prototype = heir(Bytecode.prototype);

    // installValue
    function installValue(count, pos, boxes, rhs, body) {
      Bytecode.call(this);
      this.count   = count;   // exact, non-negative integer
      this.pos     = pos;     // exact, non-negative integer
      this.boxes   = boxes;   // boolean
      this.rhs     = rhs;     // expr, seq, indirect, any
      this.body    = body;    // expr, seq, indirect, any -- set existing stack slot(s)
      this.toJSON = function(){
        return {"$":'install-value', "count": this.count.toJSON(), "pos" : this.pos.toJSON(),
               "boxes" : this.boxes.toJSON(), "rhs" : this.rhs.toJSON(),
               "body" : this.body.toJSON()};
      };
    };
    installValue.prototype = heir(Bytecode.prototype);

    // boxEnv: box existing stack element
    function boxEnv(pos, body) {
      Bytecode.call(this);
      this.pos     = pos;     // exact, non-negative integer
      this.body    = body;    // expr, seq, indirect, any
      this.toJSON = function(){
        return {"$":'boxenv', "pos": this.pos.toJSON(), "body" : this.body.toJSON()};
      };
    };
    boxEnv.prototype = heir(Bytecode.prototype);

    // localRef: access local via stack
    function localRef(unbox, pos, clear, otherClears, flonum) {
      Bytecode.call(this);
      this.unbox   = unbox;   // boolean
      this.pos     = pos;     // exact, non-negative integer
      this.clear   = clear;   // boolean
      this.flonum  = flonum;  // boolean
      this.otherClears= otherClears; // boolean
      this.toJSON = function(){
        return {"$":'localref', "unbox?": this.unbox, "pos" : this.pos,
               "clear" : this.clear, "other-clears" : this.otherClears,
               "flonum?" : this.flonum};
      };
    };
    localRef.prototype = heir(Bytecode.prototype);

    // topSyntax : access syntax object via prefix array (which is on stack)
    function topSyntax(depth, pos, midpt) {
      Bytecode.call(this);
      this.depth   = depth;   // exact, non-negative integer
      this.pos     = pos;     // exact, non-negative integer
      this.midpt   = midpt;   // exact, non-negative integer
    };
    topSyntax.prototype = heir(Bytecode.prototype);

    // application: function call
    function application(rator, rands) {
      Bytecode.call(this);
      this.rator   = rator;   // expr, seq, indirect, any
      this.rands   = rands;   // list of (expr, seq, indirect, any)
      this.toJSON = function(){
        return {"$":'application', "rator": this.rator.toJSON(), "rands" : this.rands.toJSON()};
      };
    };
    application.prototype = heir(Bytecode.prototype);

    // branch
    function branch(testExpr, thenExpr, elseExpr) {
      Bytecode.call(this);
      this.testExpr = testExpr;   // expr, seq, indirect, any
      this.thenExpr = thenExpr;   // expr, seq, indirect, any
      this.elseExpr = elseExpr;   // expr, seq, indirect, any
      this.toJSON = function(){
        return {"$":'branch', "test": this.test.toJSON(), "then" : this.thenExpr.toJSON(),
               "else" : this.elseExpr.toJSON()};
      };
    };
    branch.prototype = heir(Bytecode.prototype);

    // withContMark: 'with-cont-mark'
    function withContMark(key, val, body) {
      Bytecode.call(this);
      this.$    = 'with-cont-mark';
      this.key  = key;   // expr, seq, indirect, any
      this.val  = val;   // expr, seq, indirect, any
      this.body = body;  // expr, seq, indirect, any
      this.toJSON = function(){
        return {"$":'with-cont-mark', "key": this.key.toJSON(), "val" : this.val.toJSON(),
               "body" : this.body.toJSON()};
      };
    };
    withContMark.prototype = heir(Bytecode.prototype);

    // beg0: begin0
    function beg0(seq) {
      Bytecode.call(this);
      this.seq  = seq;   // list  of (expr, seq, indirect, any)
      this.toJSON = function(){ return {"$":'beg0', "seq": this.seq.toJSON()};  };
    };
    beg0.prototype = heir(Bytecode.prototype);

    // splice: top-level 'begin'
    function splice(forms) {
      Bytecode.call(this);
      this.forms  = forms;   // list  of (expr, seq, indirect, any)
      this.toJSON = function(){ return {"$":'splice', "forms": this.forms.toJSON()};  };
    };
    splice.prototype = heir(Bytecode.prototype);

    // varRef: `#%variable-reference'
    function varRef(topLevel) {
      Bytecode.call(this);
      this.topLevel  = topLevel;   // topLevel
      this.toJSON = function(){ return {"$":'varref', "top-level": this.topLevel.toJSON()};  };
    };
    varRef.prototype = heir(Bytecode.prototype);

    // assign: top-level or module-level set!
    function assign(id, rhs, undefOk) {
      Bytecode.call(this);
      this.id      = id;      // topLevel
      this.rhs     = rhs;     // expr, seq, indirect, any
      this.undefOk = undefOk; // boolean
      this.toJSON = function(){
        return {"$":'assign', "id": this.id.toJSON(), "rhs" : this.rhs.toJSON(),
               "undef-ok" : this.undefOk.toJSON()};
      };
    };
    assign.prototype = heir(Bytecode.prototype);

    // applyValues: `(call-with-values (lambda () ,args-expr) ,proc)
    function applyValues(proc, args) {
      Bytecode.call(this);
      this.proc    = proc;    // expr, seq, indirect, any
      this.args    = args;    // expr, seq, indirect, any
      this.toJSON = function(){
        return {"$":'apply-values', "proc": this.proc.toJSON(), "args" : this.args.toJSON()};
      };
    };
    applyValues.prototype = heir(Bytecode.prototype);

    // primVal: direct preference to a kernel primitive
    function primVal(id) {
      Bytecode.call(this);
      this.id      = id;    // exact, non-negative integer
      this.toJSON = function(){ return {"$":'primval', "id": this.id.toJSON()};  };
    };
    primVal.prototype = heir(Bytecode.prototype);

    // req
    function req(reqs, dummy) {
      Bytecode.call(this);
      this.$        = 'req';
      this.reqs    = reqs;    // syntax
      this.dummy   = dummy;   // toplevel
      this.toJSON = function(){ return {"$":'req', "reqs": this.reqs.toJSON(), "dummy" : this.dummy.toJSON()};  };
    };
    req.prototype = heir(Bytecode.prototype);

    // lexicalRename
    function lexicalRename(bool1, bool2, alist) {
      this.bool1   = bool1;    // boolean
      this.bool2   = bool2;    // boolean
      this.alist   = alist;    // should be list of (cons symbol, symbol)
      Bytecode.call(this);
    };
    lexicalRename.prototype = heir(Bytecode.prototype);

    // phaseShift
    function phaseShift(amt, src, dest) {
      this.amt     = amt;    // syntax
      this.src     = src;    // false or modulePathIndex
      this.dest    = dest;   // false or modulePathIndex
      Bytecode.call(this);
    };
    phaseShift.prototype = heir(Bytecode.prototype);

    // wrapMark
    function wrapMark(val) {
      this.val     = val;    // exact integer
      Bytecode.call(this);
    };
    wrapMark.prototype = heir(Bytecode.prototype);

    // prune
    function prune(sym) {
      this.sym     = sym;    // any
      Bytecode.call(this);
    };
    prune.prototype = heir(Bytecode.prototype);

    // allFromModule
    function allFromModule(path, phase, srcPhase, exceptions, prefix) {
      this.path     = path;       // modulePathIndex
      this.phase    = phase;      // false or exact integer
      this.srcPhase = srcPhase;   // any
      this.prefix   = prefix;     // false or symbol
      this.exceptions=exceptions; // list of symbols
      Bytecode.call(this);
    };
    allFromModule.prototype = heir(Bytecode.prototype);

    // nominalPath
    function nominalPath() {
      Bytecode.call(this);
    };
    nominalPath.prototype = heir(Bytecode.prototype);

    // simpleNominalPath
    function simpleNominalPath(value) {
      this.value = value; // modulePathIndex
      Bytecode.call(this);
    };
    simpleNominalPath.prototype = heir(Bytecode.prototype);

    // moduleBinding
    function moduleBinding() {
      Bytecode.call(this);
    };
    moduleBinding.prototype = heir(Bytecode.prototype);

    // phasedModuleBinding
    function phasedModuleBinding(path, phase, exportName, nominalPath, nominalExportName) {
      this.path       = path;       // modulePathIndex
      this.phase      = phase;      // exact integer
      this.exportName = nominalPath;// nominalPath
      this.nominalExportName  = nominalExportName; // any
      Bytecode.call(this);
    };
    phasedModuleBinding.prototype = heir(Bytecode.prototype);

    // exportedNominalModuleBinding
    function exportedNominalModuleBinding(path, exportName, nominalPath, nominalExportName) {
      this.path       = path;       // modulePathIndex
      this.exportName = exportName; // any
      this.nominalPath= nominalPath;// nominalPath
      this.nominalExportName  = nominalExportName; // any
      Bytecode.call(this);
    };
    exportedNominalModuleBinding.prototype = heir(Bytecode.prototype);

    // nominalModuleBinding
    function nominalModuleBinding(path, nominalPath) {
      this.path       = path;        // modulePathIndex
      this.nominalPath= nominalPath; // any
      Bytecode.call(this);
    };
    nominalModuleBinding.prototype = heir(Bytecode.prototype);

    // exportedModuleBinding
    function exportedModuleBinding(path, exportName) {
      this.path       = path;       // modulePathIndex
      this.exportName = exportName; // any
      Bytecode.call(this);
    };
    exportedModuleBinding.prototype = heir(Bytecode.prototype);

    // simpleModuleBinding
    function simpleModuleBinding(path) {
      this.path       = path;       // modulePathIndex
      Bytecode.call(this);
    };
    simpleModuleBinding.prototype = heir(Bytecode.prototype);

    // ModuleRename
    function ModuleRename(phase, kind, setId, unmarshals, renames, markRenames, plusKern) {
      this.phase      = phase;       // false or exact integer
      this.kind       = kind;        // "marked" or "normal"
      this.unmarshals = unmarshals;  // list of allFromModule
      this.renames    = renames;     // list of (symbol or moduleBinding)
      this.markRenames= markRenames; // any
      this.plusKern   = plusKern;    // boolean
      Bytecode.call(this);
    };
    ModuleRename.prototype = heir(Bytecode.prototype);
 
  Program.prototype.freeVariables   = function(env, acc){ return acc; }
  ifExpr.prototype.freeVariables    = function(env, acc){
    return this.alternative.freeVariables(env, this.consequence.freeVariables(env, this.predicate.freeVariables(env, acc)));
  };
  beginExpr.prototype.freeVariables = function(env, acc){
    return this.exprs.reduceRight(function(expr, acc){return expr.freeVariables(env, acc);}, acc);
  };
  symbolExpr.prototype.freeVariables= function(env, acc){
    return (env.lookup(this.val, 0) instanceof plt.compiler.unboundStackReference)? acc.concat([this.val]) : acc;
  };
  localExpr.prototype.freeVariables = function(env, acc){ return acc; };
  andExpr.prototype.freeVariables   = function(env, acc){ return acc; };
  lambdaExpr.prototype.freeVariables= function(env, acc){ return acc; };
  quotedExpr.prototype.freeVariables= function(env, acc){ return acc; };
  primop.prototype.freeVariables    = function(env, acc){ return acc; };
  ifExpr.prototype.freeVariables    = function(env, acc){ return acc; };
 
  /**************************************************************************
   *
   *    COMPILATION -
   *    (see https://github.com/bootstrapworld/wescheme-compiler2012/blob/master/js-runtime/src/mzscheme-vm.ss)
   *
   **************************************************************************/
 
   // sort-and-unique: (listof X) (X X -> boolean) (X X -> boolean) -> (listof X)
   function sortAndUnique(elts, lessThan, equalTo) {
      function unique(elts){
        return (elts.length <= 1)? elts
               :  equalTo(elts[0], elts[1])? unique(elts.slice(1))
               :  [elts[0]].concat(unique(elts.slice(1)));
      }
      return unique(elts.sort(lessThan));
   }
 
   // [bytecodes, env, pinfo], Program -> [bytecodes, pinfo, env]
   // compile the program, then add the bytecodes and pinfo information to the acc
   function compilePrograms(acc, p){
    var bytecodes = acc[0],
        pinfo     = acc[1],
        env       = acc[2],
        compiledProgramAndPinfo = p.compile(env, pinfo),
        compiledProgram = compiledProgramAndPinfo[0],
        pinfo     = compiledProgramAndPinfo[1];
    return [[compiledProgram].concat(bytecodes), pinfo, env];
   }
 
   // extend the Program class to include compilation
   // compile: pinfo -> [bytecode, pinfo]
   Program.prototype.compile = function(env, pinfo){
      return [new literal(this), pinfo];
   };
   
   defFunc.prototype.compile = function(env, pinfo){
      var compiledFunNameAndPinfo = this.name.compile(env, pinfo),
          compiledFunName = compiledFunNameAndPinfo[0],
          pinfo = compiledFunNameAndPinfo[1];
      var lambda = new lambdaExpr(this.args, this.body),
          compiledLambdaAndPinfo = lambda.compile(env, pinfo, false, this.name),
          compiledLambda = compiledLambdaAndPinfo[0],
          pinfo = compiledLambdaAndPinfo[1];
      var bytecode = new defValues([compiledFunName], compiledLambda);
      return [bytecode, pinfo];
   };

   defVar.prototype.compile = function(env, pinfo){
      var compiledIdAndPinfo = this.name.compile(env, pinfo),
          compiledId = compiledIdAndPinfo[0],
          pinfo = compiledIdAndPinfo[1];
      var compiledExprAndPinfo = this.expr.compile(env, pinfo),
          compiledExpr = compiledExprAndPinfo[0],
          pinfo = compiledExprAndPinfo[1];
      var bytecode = new defValues([compiledId], compiledExpr);
      return [bytecode, pinfo];
   };

   defVars.prototype.compile = function(env, pinfo){
        var compiledIdsAndPinfo = this.name.compile(env, pinfo),
            compiledIds = compiledIdsAndPinfo[0],
            pinfo = compiledIdsAndPinfo[1];
        var compiledBodyAndPinfo = this.body.compile(env, pinfo),
            compiledBody = compiledBodyAndPinfo[0],
            pinfo = compiledBodyAndPinfo[1];
        var bytecode = new defValues(compiledIds, compiledBody);
        return [bytecode, pinfo];
   };
   
   beginExpr.prototype.compile = function(env, pinfo){
      var compiledExpressionsAndPinfo = this.exprs.reduceRight(compilePrograms, [[], pinfo, env]),
          compiledExpressions = compiledExpressionsAndPinfo[0],
          pinfo1 = compiledExpressionsAndPinfo[1];
      var bytecode = new seq(compiledExpressions);
      return [bytecode, pinfo1];
   };

   // Compile a lambda expression.  The lambda must close its free variables over the
   // environment.
   lambdaExpr.prototype.compile = function(env, pinfo, isUnnamedLambda, name){
      // maskUnusedGlobals : (listof symbol?) (listof symbol?) -> (listof symbol or false)
      function maskUnusedGlobals(listOfNames, namesToKeep){
        listOfNames.map(function(n){ return (namesToKeep.indexOf(n)>-1)? n : false; });
      }
 
      function pushLocal(env, n){ return new plt.compiler.localEnv(n.val, false, env); }
      function pushLocalBoxed(env, n){ return new plt.compiler.localEnv(n.val, true, env); }
 
      // getClosureVectorAndEnv : (list of Symbols) (list of Symbols) env -> [(Vector of number), env]
      function getClosureVectorAndEnv(args, freeVariables, originalEnv){
        var freeVariableRefs = freeVariables.map(function(v){return originalEnv.lookup(v, 0);}),
 
            // some utility functions
            ormap = function(f, l){return (l.length===0)? false : f(l[0])? l[0] : ormap(f, l.slice(1));},
            isLocalStackRef   = function(r){return r instanceof plt.compiler.localStackReference;},
            isGlobalStackRef  = function(r){return r instanceof plt.compiler.globalStackReference;},
            isUnboundStackRef = function(r){return r instanceof plt.compiler.unboundStackReference;},
            getDepthFromRef   = function(r){ return r.depth;},
 
            // this will either be #f, or the first unboundStackRef
            anyUnboundStackRefs = ormap(isUnboundStackRef, freeVariableRefs);
 
        if(anyUnboundStackRefs){
          throw "Can't produce closure; I don't know where " + anyUnboundStackRefs.name + "is bound.";
        } else {
          var localStackRefs = freeVariableRefs.filter(isLocalStackRef),
              lexicalFreeRefs = sortAndUnique(localStackRefs,
                                              function(x,y){return x.depth < y.depth;},
                                              function(x,y){return x.depth === y.depth;}),
              lexicalFreeDepths = lexicalFreeRefs.map(getDepthFromRef),
              globalRefs        = freeVariableRefs.filter(isGlobalStackRef),
              globalDepths      = sortAndUnique(globalRefs.map(getDepthFromRef),
                                                function(x,y){return x<y;},
                                                function(x,y){return x===y;});
          // Function Arguments
          var env1 = args.reverse().reduce(pushLocal, originalEnv);
 
          // The lexical free variables
          var env2 = lexicalFreeRefs.reverse().reduce(function(ref, env){
                      return ref.boxed? pushLocalBoxed(env, ref.name) : pushLocal(env, ref.name);
                    }, env1);
 
          // The global free variables
          var env3 = globalDepths.reverse().reduce(function(depth, env){
                       var refsAtDepth = globalRefs.filter(function(ref){return ref.depth=depth;}, env2),
                           usedGlobalNames = refsAtDepth.map(function(ref){ref.name});
                       return env.pushGlobals(maskUnusedGlobals(originalEnv.peek(depth).names,
                                                                usedGlobalNames));
                     }, env2);
          return [globalDepths.concat(lexicalFreeDepths), env3];
        }
      }
 
      var envWithArgs = this.args.reduce(pushLocal, new plt.compiler.emptyEnv());
          freeVars = this.body.freeVariables(envWithArgs, []);
      var closureVectorAndEnv = getClosureVectorAndEnv(this.args, freeVars, env),
          closureVector = closureVectorAndEnv[0],
          extendedEnv = closureVectorAndEnv[1];
      var compiledBodyAndPinfo = this.body.compile(extendedEnv, pinfo),
          compiledBody = compiledBodyAndPinfo[0],
          pinfo = compiledBodyAndPinfo[1];
      var lambdaArgs = new Array(this.args.length),
          closureArgs = new Array(closureVector.length);
 
      var valSymbols = [], valRefSymbols = [];
      for(var i=0; i < this.args.length; i++)     { valSymbols.push(new symbolExpr("val"));        }
      for(var j=0; j < closureVector.length; j++) { valRefSymbols.push(new symbolExpr("val/ref")); }
 
      // emit the bytecode
      var bytecode = new lam(isUnnamedLambda? [] : name,
                             [name].concat(this.args).map(function(id){return id.location;}),
                             [],
                             this.args.length,
                             valSymbols,
                             false,
                             closureVector,
                             valRefSymbols,
                             0,
                             compiledBody);
      return [bytecode, pinfo];
   };

   localExpr.prototype.compile = function(env, pinfo){
      throw new unimplementedException("localExpr.compile");
   };
   
   callExpr.prototype.compile = function(env, pinfo){
      // add space to the stack for each argument
      var makeSpace = function(operand, env){return new plt.compiler.unnamedEnv(env);},
          extendedEnv = this.args.reduce(makeSpace),
          compiledOperatorAndPinfo = this.func.compile(extendedEnv, pinfo),
          compiledOperator = compiledOperatorAndPinfo[0],
          pinfo1 = compiledOperatorAndPinfo[1],
          compiledOperandsAndPinfo = this.args.reduceRight(compilePrograms, [[], pinfo, env]),
          compiledOperands = compiledOperatorAndPinfo[0],
          pinfo2 = compiledOperatorAndPinfo[1];
          return [new application(compiledOperator, compiledOperands), pinfo2];
   };
   
   ifExpr.prototype.compile = function(env, pinfo){
      var compiledPredicateAndPinfo = this.predicate.compile(env, pinfo),
          compiledPredicate = compiledPredicateAndPinfo[0],
          pinfo1 = compiledPredicateAndPinfo[1];
      var compiledConsequenceAndPinfo = this.consequence.compile(env, pinfo),
          compiledConsequence = compiledConsequenceAndPinfo[0],
          pinfo2 = compiledConsequenceAndPinfo[1];
      var compiledAlternateAndPinfo = this.alternative.compile(env, pinfo),
          compiledAlternate = compiledAlternateAndPinfo[0],
          pinfo3 = compiledAlternateAndPinfo[1];
      var bytecode = new branch(compiledPredicate, compiledConsequence, compiledAlternate);
      return [bytecode, pinfo3];
   };
   
   symbolExpr.prototype.compile = function(env, pinfo){
     var stackReference = env.lookup(this.val, 0), bytecode;
      if(stackReference instanceof plt.compiler.localStackReference){
        bytecode = new localRef(stackReference.boxed, stackReference.depth, false, false, false);
      } else if(stackReference instanceof plt.compiler.globalStackReference){
        bytecode = new topLevel(stackReference.depth, stackReference.pos, false, false, this.location);
      } else if(stackReference instanceof plt.compiler.unboundStackReference){
        throw "Couldn't find '"+this.val+"' in the environment";
      } else {
        throw "ANALYSIS FAILURE: env.lookup failed for '"+this.val+"'! A reference should be added to the environment!";
      }
      return [bytecode, pinfo];
   };
 
   quotedExpr.prototype.compile = function(env, pinfo){
      return [this.val, pinfo];
   };
   primop.prototype.compile = function(env, pinfo){}
   provideStatement.prototype.compile = function(env, pinfo){};
   requireExpr.prototype.compile = function(pinfo){
     return [new req(this.spec, new topLevel(0, 0, false, false, false)), pinfo];
   };

   // compile-compilation-top: program pinfo -> bytecode
   function compileCompilationTop(program, pinfo){
      // makeModulePrefixAndEnv : pinfo -> [prefix, env]
      // collect all the free names being defined and used at toplevel
      // Create a prefix that refers to those values
      // Create an environment that maps to the prefix
      function makeModulePrefixAndEnv(pinfo){
        var extractModuleBindings = function(m){return m.moduleBindings;},
            requiredModuleBindings = pinfo.modules.reduce(extractModuleBindings, []),
 
            isNotRequiredModuleBinding = function(b){ return b.moduleSource && (requiredModuleBindings.indexOf(b) === -1)},
            moduleOrTopLevelDefinedBindings = pinfo.usedBindingsHash.values().filter(isNotRequiredModuleBinding),
 
            allModuleBindings = requiredModuleBindings.concat(moduleOrTopLevelDefinedBindings),

            // utility functions for making globalBuckets and moduleVariables
            makeGlobalBucket = function(name){ return new globalBucket(name);},
            makeModuleVariablefromBinding = function(b){
              return new moduleVariable(modulePathIndexJoin(b.moduleSource,
                                                            modulePathIndexJoin(false, false))
                                        , getBindingId(b)
                                        , -1
                                        , 0);
            };
        var topLevels = [false].concat(pinfo.freeVariables.map(makeGlobalBucket)
                                      ,pinfo.definedNames.keys().map(makeGlobalBucket)
                                      ,allModuleBindings.map(makeModuleVariablefromBinding)),
            globals = [false].concat(pinfo.freeVariables,
                                         pinfo.definedNames.values(),
                                         allModuleBindings),
            globalNames = globals.map(function(b){return b.name;});
 
        return [new prefix(0, topLevels ,[])
               , new plt.compiler.globalEnv(globalNames, false, new plt.compiler.emptyEnv())];
      };
 
      // The toplevel is going to include all of the defined identifiers in the pinfo
      // The environment will refer to elements in the toplevel.
      var toplevelPrefixAndEnv = makeModulePrefixAndEnv(pinfo),
          toplevelPrefix = toplevelPrefixAndEnv[0],
          env = toplevelPrefixAndEnv[1];
   
      // pull out separate program components for ordered compilation
      var defns    = program.filter(plt.compiler.isDefinition),
          requires = program.filter((function(p){return (p instanceof requireExpr);})),
          provides = program.filter((function(p){return (p instanceof provideStatement);})),
          exprs    = program.filter(plt.compiler.isExpression);
      console.log('compiling requires...');
      var compiledRequiresAndPinfo = requires.reduceRight(compilePrograms, [[], pinfo, env]),
          compiledRequires = compiledRequiresAndPinfo[0],
          pinfo = compiledRequiresAndPinfo[1];
      console.log('compiling definitions...');
      var compiledDefinitionsAndPinfo = defns.reduceRight(compilePrograms, [[], pinfo, env]),
          compiledDefinitions = compiledDefinitionsAndPinfo[0],
          pinfo = compiledDefinitionsAndPinfo[1];
      console.log('compiling expressions...');
      var compiledExpressionsAndPinfo = exprs.reduceRight(compilePrograms, [[], pinfo, env]),
          compiledExpressions = compiledExpressionsAndPinfo[0],
          pinfo = compiledExpressionsAndPinfo[1];
      // generate the bytecode for the program and return it, along with the program info
      var forms = new seq([].concat(compiledRequires, compiledDefinitions, compiledExpressions)),
          bytecode = new compilationTop(0, toplevelPrefix, forms),
          response = {"permissions" : pinfo.permissions(),
                      "bytecode" : "/* runtime-version: clientside-summer-2014 */n" + JSON.stringify(bytecode.toJSON()),
                      "provides" : pinfo.providedNames.keys()};
          return response;
   }
 
 
  /////////////////////
  /* Export Bindings */
  /////////////////////
 plt.compiler.compile = compileCompilationTop;
 })();

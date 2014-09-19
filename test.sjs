var kessel = require('./lib');
var sinon  = require('sinon');
var expect = require('sinon-expect').enhance(require('expect.js'), sinon, 'was');

var Success = kessel.Success;
var Failure = kessel.Failure;

/*
macro λ {
	rule { $p:ident -> $r:expr } => {function($p) { return $r }}
}

var atom  = %/[a-z0-9\-_$]/i;
var seq   = cexpr ~ seq | kessel.empty;
var sexpr = atom | (%"(" ~ seq ~ %")" ^^ λ a -> a[1]);
var cexpr = (%"{" ~ sexpr ~ atom ~ sexpr ~ %"}" ^^ λ a -> [a[2], a[1], a[3]]) | sexpr;

var result = cexpr("(a {a - c} (a))");
console.log(result.token ? JSON.stringify(result.token, null, 2) : result.message);*/

macro => {
	rule { $r:expr } => { (function() {return $r}) }
}

macro (=!>) {
	rule infix { ($l:expr (,) ...) | $r:expr } => { sinon.stub().withArgs($($l (,) ...)).returns($r) }
	rule { $r:expr } => { sinon.stub().returns($r) }
}

macro to_str {
  case { _ ($toks ...) } => {
    return [makeValue(#{ $toks ... }.map(unwrapSyntax).join(''), #{ here })];
  }
}
let describe = macro {
	rule { $s $body } => { describe($s, function() $body); }
}
let it = macro {
	rule { $s $body } => { it($s, function() $body); }
}

describe "keyword" {
	describe "matching" {
		it "should match exact matches" {
			expect(kessel.keyword("a","a")).to.be.a(Success);
		}
		it "should save match as token" {
			expect(kessel.keyword("a","a")).to.have.property("token", "a");
		}
		it "should match prefix match" {
			expect(kessel.keyword("a","abc")).to.be.a(Success);
		}
		it "should save prefix match as token" {
			expect(kessel.keyword("a","abc")).to.have.property("token", "a");
		}
		it "should save prefix remainder as rest" {
			expect(kessel.keyword("a","abc")).to.have.property("rest", "bc");
		}
	}

	describe "not matching" {
		it "doesn't match something completely different" {
			expect(kessel.keyword("a", "b")).to.be.a(Failure);
		}

		it "gives an expected message" {
			expect(kessel.keyword("a", "b")).to.have.property("message", "Expected 'a' got 'b'");
		}

		it "doesn't match an incomplete match" {
			expect(kessel.keyword("asdf", "a")).to.be.a(Failure);
		}

		it "gives an expected message for incomplete match" {
			expect(kessel.keyword("asdf", "a")).to.have.property("message", "Expected 'asdf' got 'a'");
		}
	}
}

describe "seq" {
	describe "success followed by success" {
		it "should be success" {
			expect(kessel.seq(=> => Success("",""), => => Success("",""))()).to.be.a(Success);
		}

		it "should give an array of tokens" {
			expect(kessel.seq(=> => Success("a",""), => => Success("b",""))().token).to.eql(["a","b"]);
		}

		it "should match left on arg of seq" {
			var l = ("a")=!> Success("a", "");
			expect(kessel.seq(=> l, => => Success("",""))("a")).to.be.a(Success);
			expect(l).was.calledWith("a");
		}

		it "should match right on rest of left" {
			var r = ("b")=!> Success("b", "");
			expect(kessel.seq(=> => Success("", "b"), => r)()).to.be.a(Success);
			expect(r).was.calledWith("b");
		}

		it "should give rest as rest of right" {
			var r = ("b")=!> Success("b", "");
			expect(kessel.seq(=> => Success("", ""), => => Success("", "c"))()).to.have.property("rest", "c");
		}
	}
}
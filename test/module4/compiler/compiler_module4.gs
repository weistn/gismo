import "gismo/transform"
import "gismo/template"
import "gismo/metaprogramming"

transform mysuper(classname) (super.@foo) with template (@classname.__super__.@foo)

transform myfunc() {
	function @x(@params) {
		@code
	}
}
where params.length > 0
with template {
	function @("export_" + x.name)(@params) {
		@myvar(code)
	}
}

transform myvar() {var @x = @expr} with template{ module.@x = @expr }

statement transformTest {
    var code = parser.parseBlockStatement();
    code = myvar(code);
    return mysuper(code, identifier "MyClass");
}

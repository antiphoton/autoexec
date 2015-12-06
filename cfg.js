$((function() {
    var divMain=$('div#main');
    var editorSrc;
    var btnCompile=$('<button/>').text('Comiple');
    var NameLib=(function() {
        var prefix='cbx_';
        var suffix='';
        var n=0;
        var reset=function() {
            n=0;
        };
        var apply=function() {
            return prefix+(++n)+suffix;
        };
        return {//NameLib
            apply:apply,
            reset:reset
        };
    })();
    var ErrorChar=function(i) {
        this.pos=i;
    };
    var ErrorBracket=function(i) {
        this.pos=i;
    };
    var findRegFrom=function(s,r,i) {
        r.lastIndex=i;
        r.test(s);
        return r.lastIndex-1;
    };
    var Block=function(s,begin,isRoot) {
        if (s===undefined) {
            return ;
        }
        begin=s.indexOf('{',begin);
        this.begin=begin;
        if (isRoot) {
            this.isRoot=true;
        }
        else {
            this.isRoot=false;
        }
        this.list=[];
        this.name=NameLib.apply();
        var a;
        var i=begin+1;
        while (1) {
            i=findRegFrom(s,/\S/g,i);
            if (s[i]==='}') {
                break;
            };
            a=new Statement(s,i);
            this.list.push(a);
            a.atRoot=this.isRoot;
            i=a.end;
        }
        this.end=i+1;
    };
    var Statement=function(s,begin) {
        if (s instanceof Statement) {
            this.name=NameLib.apply();
            this.begin=s.begin;
            this.end=s.end;
            this.list=[];
            return ;
        }
        this.begin=begin;
        this.list=[];
        this.name=NameLib.apply();
        var a;
        var i=begin,j;
        while (1) {
            i=findRegFrom(s,/\S/g,i);
            if (s[i]===';') {
                break;
            }
            if (s[i]==='{') {
                a=new Block(s,i);
                this.list.push(a);
                i=a.end;
                continue;
            }
            if (/\w/.test(s[i])) {
                j=findRegFrom(s,/\W/g,i);
                a=s.substring(i,j);
                this.list.push(a);
                i=j;
                continue;
            }
            throw new ErrorChar(i);
        }
        this.end=i+1;
    };
    var print=function(stdout,x) {
        var a;
        var i;
        if (x instanceof Block) {
            a=['alias ',x.name,' "'];
            for (i=0;i<x.list.length;i++) {
                print(stdout,x.list[i]);
                if (x.list[i].noprint) {
                }
                else {
                    a.push(x.list[i].name);
                    a.push('; ');
                }
            }
            a.push('"');
            if (x.isRoot) {
            }
            else {
                stdout.push(a.join(''));
            }
        }
        if (x instanceof Statement) {
            if (x.atRoot) {
                a=[];
            }
            else {
                a=['alias',x.name];
            }
            for (i=0;i<x.list.length;i++) {
                if (typeof(x.list[i])==='string') {
                    a.push(x.list[i]);
                }
                else {
                    print(stdout,x.list[i]);
                    a.push(x.list[i].name);
                }
            }
            if (x.noprint) {
            }
            else {
                stdout.push(a.join(' '));
            }
        }
    };
    var compile=(function() {
        var root;
        var expand=function(x) {
            var a;
            var r;
            var i,j;
            if (x instanceof Block) {
                for (i=0;i<x.list.length;i++) {
                    r=expand(x.list[i]);
                    if (r instanceof Array) {
                        x.list.splice(i,1);
                        for (j=0;j<r.length;j++) {
                            x.list.splice(i+j,0,r[j]);
                        }
                        i--;
                    }
                };
            }
            if (x instanceof Statement) {
                for (i=0;i<x.list.length;i++) {
                    expand(x.list[i]);
                };
                if (x.list[0]==='keydown') {
                    r=[new Statement(x),new Statement(x)];
                    r[0].list.push('bind');
                    r[1].list.push('');
                    r[1].noprint=true;
                    r[0].list.push(x.list[1]);
                    r[1].list.push(x.list[1]);
                    r[0].list.push(x.list[2]);
                    r[1].list.push(x.list[3]);
                    r[0].list[2].name='+'+r[0].list[2].name;
                    r[1].list[2].name='-'+r[0].list[2].name.substring(1);
                    return r;
                }
            }
        };
        return function(codeSrc) {
            NameLib.reset();
            root=new Block(codeSrc,0,true);
            expand(root);
            var stdout=[];
            print(stdout,root);
            return stdout.join('\n');
        };
    })();
    btnCompile.click(function() {
        var s=editorSrc.getValue();
        s=compile(s);
        editorDst.setValue(s);
    });
    var initCtrl=function() {
        var divSrc=$('<div/>').attr('id','divSrc');
        var divDst=$('<div/>').attr('id','divDst');
        divMain.append(divSrc);
        divMain.append(btnCompile);
        divMain.append(divDst);
        editorSrc=ace.edit('divSrc');
        editorDst=ace.edit('divDst');
        editorSrc.setTheme('ace/theme/monokai');
        editorDst.setTheme('ace/theme/monokai');
    };
    var onload=function() {
        document.title='Config Compiler';
        initCtrl();
        $.get('auto.txt',function(data) {
            editorSrc.setValue(data);
        });
    };
    return onload;
})());


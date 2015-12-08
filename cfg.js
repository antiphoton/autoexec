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
    var CompileError=function(begin,end,message) {
        var doc=editorSrc.session.getDocument();
        begin=doc.indexToPosition(begin);
        end=doc.indexToPosition(end);
        var range={start:begin,end:end};
        editorSrc.session.getSelection().setSelectionRange(range);
        editorDst.setValue(message);
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
        this.declare=true;
        this.execute=true;
        this.list=[];
        this.name=NameLib.apply();
        var a;
        var i=begin+1;
        var lastI;
        while (1) {
            i=findRegFrom(s,/\S/g,i);
            if (i===-1) {
                throw new CompileError(begin,begin+1,"Left bracket not matched");
            }
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
            this.atRoot=s.atRoot;
            this.declare=s.declare;
            this.execute=s.execute;
            this.list=[];
            return ;
        }
        this.begin=begin;
        this.declare=true;
        this.execute=true;
        this.atRoot=false;
        this.list=[];
        this.name=NameLib.apply();
        var a;
        var i=begin,j;
        var lastI;
        while (1) {
            lastI=i;
            i=findRegFrom(s,/\S/g,i);
            if (i===-1) {
                throw new CompileError(lastI,i,'Missing ";"');
            }
            if (s[i]===';') {
                break;
            }
            if (s[i]==='{') {
                a=new Block(s,i);
                this.list.push(a);
                i=a.end;
                continue;
            }
            if (/[^\s;\{\}]/.test(s[i])) {
                j=findRegFrom(s,/[\s;\{\}]/g,i);
                a=s.substring(i,j);
                this.list.push(a);
                i=j;
                continue;
            }
            throw new CompileError(lastI,i,'Missing ";"');
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
                if (x.list[i].execute) {
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
                a=['alias ',x.name,' "'];
            }
            for (i=0;i<x.list.length;i++) {
                if (typeof(x.list[i])==='string') {
                    a.push(x.list[i]);
                }
                else {
                    print(stdout,x.list[i]);
                    a.push(x.list[i].name);
                }
                a.push(' ');
            }
            if (x.atRoot) {
            }
            else {
                a.push(';"');
            }
            if (x.declare) {
                stdout.push(a.join(''));
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
                    r[0].list.push('');
                    r[1].list.push('bind');
                    r[0].declare=false;
                    r[0].execute=false;
                    r[0].list.push(x.list[1]);
                    r[1].list.push(x.list[1]);
                    r[0].list.push(x.list[3]);
                    r[1].list.push(x.list[2]);
                    r[0].list[2].name='-'+r[0].list[2].name;
                    r[1].list[2].name='+'+r[0].list[2].name.substring(1);
                    return r;
                }
            }
        };
        var replace=(function() {
            var libStack;
            var f=function(x) {
                var a;
                var r;
                var i,j;
                var pushed;
                if (x instanceof Statement) {
                    if (x.list[0]==='func') {
                        libStack.push([x.list[1],x.list[2].name]);
                        x.list.shift();
                        x.list.shift();
                        x.execute=false;
                        x.declare=false;
                        pushed=1;
                    }
                    else {
                        pushed=0;
                    }
                    for (i=0;i<x.list.length;i++) {
                        if (typeof(x.list[i])==='string') {
                            for (j=libStack.length-1;j>=0;j--) {
                                if (libStack[j][0]===x.list[i]) {
                                    x.list[i]=libStack[j][1];
                                    break;
                                }
                            }
                        }
                        f(x.list[i]);
                    }
                    return pushed;
                }
                if (x instanceof Block) {
                    pushed=0;
                    for (i=0;i<x.list.length;i++) {
                        r=f(x.list[i]);
                        pushed+=r;
                    }
                    for (i=0;i<pushed;i++) {
                        libStack.pop();
                    }
                }
            };
            return function(x) {
                libStack=[];
                f(x);
            };
        })();
        var merge=function() {
        };
        return function(codeSrc) {
            NameLib.reset();
            root=new Block(codeSrc,0,true);
            expand(root);
            replace(root);
            var stdout=[];
            print(stdout,root);
            return stdout.join('\n');
        };
    })();
    btnCompile.click(function() {
        var s=editorSrc.getValue();
        editorDst.setValue('');
        try {
            s=compile(s);
            editorDst.setValue(s);
        }
        catch (e) {
        }
        editorDst.session.getSelection().moveCursorFileStart();
    });
    var initCtrl=function() {
        var divSrc=$('<div/>').attr('id','divSrc');
        var divDst=$('<div/>').attr('id','divDst');
        divMain.append(divSrc);
        divMain.append(btnCompile);
        divMain.append(divDst);
        editorSrc=ace.edit('divSrc');
        editorDst=ace.edit('divDst');
        editorSrc.setTheme('ace/theme/chrome');
        editorDst.setTheme('ace/theme/chrome');
    };
    var onload=function() {
        document.title='Config Compiler';
        initCtrl();
        $.get('auto.txt',function(data) {
            editorSrc.setValue(data);
            editorSrc.session.getSelection().moveCursorFileStart();
        });
    };
    return onload;
})());


.PHONY: all status update build fixperms clean

first:
	@echo "Usage:  make { all | update | status | compile | fixperms | clean | tar }"

all:
	$(MAKE) clean
	$(MAKE) quickup
	$(MAKE) build
	$(MAKE) fixperms

status:
	git status

quickup:
	git pull origin master

update:
	git pull origin master
	$(MAKE) fixperms

build:
	cd build && ./lorenzBuild.pl $(app)

fixperms:
ifeq (${PWD},/usr/global/web-pages/lc/www/lorenz)
	@echo "In production"
	find . -name '*.cgi' -exec chmod +x {} 2>/dev/null \;
	find . -name '*' -exec chmod u+rwX,g=u,o+rX,o-w {} 2>/dev/null \;
	find . -name '*' -exec chgrp lorenz {}  2>/dev/null \;
	find ./admin -exec chmod g=u,o-rx {} 2>/dev/null \;
	find ./server/bin -exec chmod 775 {} 2>/dev/null \;
	chmod 755 server/admin/bin/* 2>/dev/null
else
	@echo "Not in production"
	find . -wholename ./dev -prune -o -name '*.cgi' -exec chmod +x {} \;
	chmod -R g+rX,g-w,o+rX,o-w . ; chgrp -R lorenz .
	find ./server/bin -exec chmod 775 {} 2>/dev/null \;
endif


clean:
	find . -wholename ./dev -prune -o -name '*compiled.js' -exec rm -f {} \;
	find . -wholename ./dev -prune -o -name '*compiled.css' -exec rm -f {} \;

tar:
	tar cf lorenz.tar --exclude .svn --exclude /.svn --exclude dev --exclude '*.tar' *
	chmod 660 lorenz.tar; chgrp lorenz lorenz.tar

tags:
	echo TOP=$(CURDIR)
	find . -name '*.pm' -exec etags -l perl -a  -o $(CURDIR)/TAGS2 {} \;

scaff:
	mkdir $(target)
	mkdir $(target)/css
	mkdir $(target)/scripts
	mkdir $(target)/templates
	touch $(target)/css/$(app).css
	touch $(target)/scripts/$(app).js
	touch $(target)/templates/$(app).tmpl
	touch $(target)/$(app).cgi
	$(MAKE) fixperms

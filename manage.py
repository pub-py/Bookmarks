# -*- coding:utf-8 -*-
import sys

reload(sys)
sys.setdefaultencoding('utf-8')

import os
import traceback

from tornado import web
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.options import define, parse_command_line
from tornado.web import TemplateModule

define("port", default=8888, help="run on the given port", type=int)
define("mysql_host", default="127.0.0.1:3306", help="blog database host")
define("mysql_database", default="blog", help="blog database name")
define("mysql_user", default="blog", help="blog database user")
define("mysql_password", default="blog", help="blog database password")


class Application(web.Application):
    def __init__(self):
        from handle import MainHandler
        from handle import BKHandler
        from handle import UploadHandler
        from handle import TestHandler
        handlers = [
            (r"/", MainHandler),
            (r"/bk/?(?P<pth>.*)", BKHandler),
            (r"/file/?(?P<filename>.*)", UploadHandler),
            (r"/download", BKHandler),
            (r"/test", TestHandler),
            # (r"/bk/(?P<id>.*)", TaskHandler),
        ]

        from uimodule import MenubarModule
        from uimodule import FooterModule
        from uimodule import UploadModule
        from uimodule import SidebarModule
        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            ui_modules={
                'include': TemplateModule,
                "Menubar": MenubarModule,
                "Footer": FooterModule,
                "Upload": UploadModule,
                "Sidebar": SidebarModule,
            },
            xsrf_cookies=False,
            cookie_secret="__TODO:_GENERATE_YOUR_OWN_RANDOM_VALUE_HERE__",
            # login_url="/auth/login",
            debug=True,
        )
        super(Application, self).__init__(handlers, **settings)


if __name__ == "__main__":
    parse_command_line()

    app = Application()
    # wsgi_app = wsgi.WSGIAdapter(app)

    loop = IOLoop.instance()

    print "http://{}:{}".format("localhost", 8887)

    HTTPServer(app).listen(8887)
    try:
        # server = gevent.wsgi.WSGIServer(('', 8888), wsgi_app, debug=True)
        # server.serve_forever()
        # loop.add_callback(webbrowser.open, url)
        loop.start()
    except KeyboardInterrupt:
        print(" Shutting down on SIGINT!")
        loop.stop()
        traceback.format_exc()
    finally:
        pass


# loop.close()
# IOLoop.current().start()
# IOLoop.current().start()

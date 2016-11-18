# -*- coding:utf-8 -*-
from tornado import web


class SidebarModule(web.UIModule):
    def render(self):
        return self.render_string("modules/sidebar.html", names={})

    def css_files(self):
        return "modules/sidebar/index.css"

    def javascript_files(self):
        return "modules/sidebar/index.js"


class UploadModule(web.UIModule):
    def render(self):
        return self.render_string("modules/upload.html")


class MenubarModule(web.UIModule):
    def render(self):
        _data = [
            {"name": "Home", "url": "/"},
            {"name": "BookMark", "url": "/bk"},
            {"name": "Feed", "url": "/feed"},
            {"name": "Test", "url": "/test"},
        ]

        return self.render_string("modules/menubar.html", menus=_data)

    def css_files(self):
        return "modules/menubar/index.css"


class FooterModule(web.UIModule):
    def render(self):
        return self.render_string("modules/footer.html")

    def css_files(self):
        return "modules/footer/index.css"

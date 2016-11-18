# -*- coding:utf-8 -*-
import os

from tornado import web
from tornado.escape import json_encode


class UploadHandler(web.RequestHandler):
    def get(self, filename=None):

        if not filename:
            self.redirect("/")

        print('i download file handler : ', filename)
        # Content-Type这里我写的时候是固定的了，也可以根据实际情况传值进来
        self.set_header('Content-Type', 'application/octet-stream')
        self.set_header('Content-Disposition', 'attachment; filename=' + filename)
        # 读取的模式需要根据实际情况进行修改

        upload_path = os.path.join(os.path.dirname(__file__), 'files', filename)
        with open(upload_path, 'rb') as f:
            while True:
                data = f.read(1024)
                if not data:
                    break
                self.write(data)
        # 记得有finish哦
        self.finish()

    def post(self, **kwargs):
        upload_path = os.path.join(os.path.dirname(__file__), 'files')  # 文件的暂存路径
        file_metas = self.request.files['file']  # 提取表单中‘name’为‘file’的文件元数据
        for meta in file_metas:
            filename = meta['filename']
            filepath = os.path.join(upload_path, filename)
            with open(filepath, 'wb') as up:  # 有些文件需要已二进制的形式存储，实际中可以更改
                up.write(meta['body'])
            self.write('ok')


class MainHandler(web.RequestHandler):
    def get(self):
        self.render("homepage.html")

    @web.asynchronous
    def post(self):
        name = self.get_secure_cookie('name')
        msg = self.get_argument('msg', '')

        if name == '':
            name = 'Anonymous'

        print name, msg

        # data = json_encode({'name': name, 'msg': msg})
        # self.write(json_encode({'result': True}))
        self.finish()


class TestHandler(web.RequestHandler):
    def get(self):
        self.render("test2.html")


class BKHandler(web.RequestHandler):
    from books2json import BookMarks
    bk = BookMarks('./files/bkm.html').dedup()

    def get(self, pth=None):

        print pth
        print repr(pth)

        if not pth:
            self.render("bk/index.html", bkms=self.bk.get_bookmark(u'\u4e66\u7b7e\u680f', folder=True))
        else:
            self.write(json_encode(self.bk.get_bookmark(pth)))

    @web.asynchronous
    def post(self):
        name = self.get_secure_cookie('name')
        msg = self.get_argument('msg', '')

        if name == '':
            name = 'Anonymous'

        print name, msg

        # data = json_encode({'name': name, 'msg': msg})
        # self.write(json_encode({'result': True}))
        self.finish()

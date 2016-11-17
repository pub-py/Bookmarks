# -*- coding:utf-8 -*-
import sys

from bs4 import BeautifulSoup

reload(sys)
sys.setdefaultencoding('utf-8')


class BookMarks(object):
    HEADER = u'''<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>\n'''
    DT = u'<DT><A HREF="{href}" ADD_DATE="{add_date}" ICON="{icon}" TAGS="{tags}">{text}</A>\n'.format
    DL = u'<DL><p>\n{0}</DL><p>\n'.format
    TITLE = u'<DT><H3 ADD_DATE="{add_date}" LAST_MODIFIED="{last_modified}" PERSONAL_TOOLBAR_FOLDER="{personal_toolbar_folder}">{text}</H3>\n'.format

    def __init__(self, bookmark_path):
        self.json_data = {}
        self.delimiter = "-yy-"
        with open(bookmark_path, "r") as f:
            _d = f.read().replace("<p>", "")
            _d = _d.replace("<DT>", "</DT><DT>")
            bs = BeautifulSoup(_d, "lxml")
            self.dl = bs.dl

    def to_dict(self):
        '''
        将bookmark解析成字典
        :return:
        '''
        [self.json_data.update(d) for d in self.bookmarks2json(self.dl)]
        return self.json_data

    def to_html(self):
        '''
        将转化后的字典还原成bookmark
        :return:
        '''
        return self.HEADER + self.DL("\n".join(list(self.json2bookmarks(self.json_data or self.to_dict()))))

    def bookmarks2json(self, dl):
        for i, c in enumerate(dl.contents):
            if c.name != 'dt':
                continue

            if getattr(c, 'a', None):
                yield {c.a.text.strip(): {
                    "add_date": c.a.attrs.get("add_date"),
                    "href": c.a.attrs.get("href"),
                    "icon": c.a.attrs.get("icon"),
                }}
            else:
                for t in dl.contents[i:]:
                    if t.name != 'dl':
                        continue

                    m = {"title": {
                        "add_date": c.h3.attrs.get("add_date"),
                        "last_modified": c.h3.attrs.get("last_modified"),
                        "personal_toolbar_folder": c.h3.attrs.get("personal_toolbar_folder"),
                    }}
                    for i in self.bookmarks2json(t):
                        k, v = i.items().pop()
                        if m.get(k):
                            m[k].update(v)
                        else:
                            m.update(i)

                    yield {
                        c.h3.text.strip(): m
                    }
                    break

    def json2bookmarks(self, _data):
        for text, t in _data.items():
            title = t.get("title")
            if title:
                yield self.TITLE(
                    add_date=title.get("add_date"),
                    text=text,
                    last_modified=title.get("last_modified"),
                    personal_toolbar_folder=title.get("personal_toolbar_folder")
                ) + self.DL("\n".join(list(self.json2bookmarks(t))))
            else:
                yield self.DT(
                    href=t.get("href"),
                    add_date=t.get("add_date"),
                    icon=t.get("icon"),
                    text=text,
                    tags=t.get("tags", "hello")
                )

    def __dict2list(self, json_data):
        '''
        将bookmark字典树变成一个列表
        :param json_data:
        :return:
        '''
        for text, t in json_data.items():
            if t.get("title"):
                for i in self.__dict2list(t):
                    if i == "title":
                        continue
                    yield text + self.delimiter + i
            else:
                yield text

    def get_duplication(self):
        '''
        得到重复的书签
        :return:
        '''
        duplication = {}
        for d in self.__dict2list(self.json_data or self.to_dict()):
            t = d.rsplit(self.delimiter, 1).pop()
            if not duplication.get(t):
                duplication[t] = [d]
            else:
                duplication[t].append(d)

        return filter(lambda x: len(x[1]) > 1, duplication.items())

    def del_bookmark(self, bkm_pth):
        for _bk_path in bkm_pth[1:]: exec u'del {}'.format(self.__get_bkm_real_pth(_bk_path))
        return self

    def get_bookmark(self, bkm_pth):
        return eval(self.__get_bkm_real_pth(bkm_pth))

    def set_bookmark(self, bkm_pth, data):
        exec self.__get_bkm_real_pth(bkm_pth) + "={}".format(data)

    def update_bookmark(self, bkm_pth, data):
        exec self.__get_bkm_real_pth(bkm_pth) + ".update({})".format(data)

    def __get_bkm_real_pth(self, bkm_pth):
        a = u'self.json_data'
        for t in bkm_pth.rsplit(self.delimiter):
            a += u'[u"{}"]'.format(t)
        return a

    def dedup(self):
        '''
        对书签进行去重，保留一个
        :return:
        '''
        for _, bk_path in self.get_duplication():
            self.del_bookmark(bk_path)
        return self


if __name__ == '__main__':
    bk = BookMarks('./bookmarks.html')
    print bk.to_dict()
    print bk.to_html()
    print bk.dedup().to_dict()
    pass

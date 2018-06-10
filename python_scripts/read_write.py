# pylint: disable = C0111, C0103, C0411, C0301, W0102
"""This module is used to read data from the external mongodb database,
   or to read data from the local drive (e.g. from json)
   or to write data to local drive (e.g. to json).
   \n Mainly this module will be used as a library."""
import pymongo
import json
import numpy as np
from copy import deepcopy
import py_node_communication as pynocomm
import os

DATABASE_URI = 'mongodb://' + str(os.environ['KEYSTROKE_DYNAMICS_MLAB_USER']) + ':' + str(
    os.environ['KEYSTROKE_DYNAMICS_MLAB_PASSWORD']) + '@' + str(os.environ['KEYSTROKE_DYNAMICS_MLAB_HOST'])


def load_from_mongodb(query={}):
    """Loads data from the external mongodb database.
    \nquery: TODO ->If specified it will be used as a query. It can take subject and/or track_code"""
    print '\nLoading docs from external database.\n'
    client = pymongo.MongoClient(DATABASE_URI)
    db = client['keystroke-dynamics-database']
    collection = db['keystrokedatamodels']
    if query == {}:
        cur = collection.find({})
    return cur


def write_timings_to_local(data, filename='subjects-data', convert_np_to_list=True):
    """Writes subjects-data as json to local drive."""
    pynocomm.send_to_node('\nWriting subjects timings data to local drive.\n')
    tmp = deepcopy(data)
    with open(filename + '.json', 'w') as fout:
        # Convert numpy arrays to list of lists :/
        for s in tmp:
            for p in s['data']:
                p['points'] = p['points'].tolist()
        json.dump(tmp, fout)


def read_timings_from_local(filename='subjects-data.json', specific_subject=None):
    """Reads json from local drive."""
    pynocomm.send_to_node('\nLoading subjects timings data  from local.\n')
    with open(filename) as data_file:
        data = json.loads(data_file.read())
    # tmp = deepcopy(data)  # maybe time consuming
    if specific_subject is None:
        # Return all
        for s in data:
            for p in s['data']:
                p['points'] = np.array(p['points'])
        return data
    else:
        # Return back only the portion of a specific_subject
        _tmp = [d for d in data if d['subject'] == specific_subject][0]
        for p in _tmp['data']:
            p['points'] = np.array(p['points'])
        return _tmp
